import { DrizzleBetterSQLite3DatabaseConfig } from "drizzle-orm/better-sqlite3";
import { Router } from "express";
import db from "./db";
import { tokens, users } from "./db/schema";
import { eq } from "drizzle-orm";
import { fromISOTimestamp } from "./utils/dates";
import { randomBytes } from "crypto";
import { token } from "./utils/token";

function createOAuthLoginUri() {
    const redirectUri = process.env.OAUTH_CALLBACK_URI;
    const clientId = process.env.OAUTH_CLIENT_ID;
    const providerUrl = process.env.OAUTH_AUTHORIZE_URL;
    const scope = process.env.OAUTH_SCOPE;

    // also check for urls needed later
    const tokenUrl = process.env.OAUTH_TOKEN_URL;
    const userInfoUrl = process.env.OAUTH_USERINFO_URL;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;

    if (!redirectUri || !clientId || !providerUrl || !scope || !tokenUrl || !userInfoUrl || !clientSecret) {
        throw new Error("Missing required OAuth environment variables");
    }

    return (): [string, string] => {
        const randomState = randomBytes(16).toString("hex");
        const params = new URLSearchParams({
            redirect_uri: redirectUri,
            client_id: clientId,
            response_type: "code",
            scope: scope,
            state: randomState,
        });

        return [`${providerUrl}?${params.toString()}`, randomState];
    };
}

async function exchangeCodeForToken(code: string) {
    const tokenUrl = process.env.OAUTH_TOKEN_URL!;
    const clientId = process.env.OAUTH_CLIENT_ID!;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET!;
    const redirectUri = process.env.OAUTH_CALLBACK_URI!;

    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });


        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.access_token || null;
    } catch (error) {
        return null;
    }
}

async function getUserInfo(accessToken: string) {
    try {
        const userInfoUrl = process.env.OAUTH_USERINFO_URL!;

        const response = await fetch(userInfoUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data || null;
    } catch {
        return null;
    }
}

export default function login() {
    const app = Router();

    const LOGIN_URI = createOAuthLoginUri();

    app.get("/login", async (req, res) => {
        try {
            if (req.cookies?.token) {
                // validate token
                const token = req.cookies.token;
                const tokenData = await db.query.tokens.findFirst({
                    where: eq(tokens.id, token),
                    columns: {
                        expiresAt: true,
                        id: true,
                    },
                });

                if (!tokenData) {
                    const [loginUri, randomState] = LOGIN_URI();
                    res.cookie("oauth_state", randomState, {
                        httpOnly: true,
                        secure: true,
                        expires: new Date(Date.now() + 5 * 60 * 1000),
                    });
                    res.redirect(loginUri);
                    return;
                }

                if (fromISOTimestamp(tokenData.expiresAt)) {
                    // Token is valid
                    // redirect to dashboard
                    res.redirect("/dashboard");
                    return;
                }

                // Token is expired

                const [loginUri, randomState] = LOGIN_URI();
                res.cookie("oauth_state", randomState, {
                    httpOnly: true,
                    secure: true,
                    expires: new Date(Date.now() + 5 * 60 * 1000),
                });
                res.redirect(loginUri);
                return;
            }

            const [loginUri, randomState] = LOGIN_URI();
            res.cookie("oauth_state", randomState, {
                httpOnly: true,
                secure: true,
                expires: new Date(Date.now() + 5 * 60 * 1000),
            });
            res.redirect(loginUri);
            return;

        } catch (err) {
            res.status(500).send("Server Error: Try again later");
        }
    });

    app.get("/callback", async (req, res) => {
        const code = req.query.code as string;
        if (!code) {
            res.status(400).send("Missing code");
            return;
        }

        try {
            const accessToken = await exchangeCodeForToken(code);
            if (accessToken === null) {
                res.status(401).send("OAuth: Unable to receive access token");
                return;
            }
            const userInfo = await getUserInfo(accessToken);
            if (userInfo === null) {
                res.status(401).send("OAuth: Unable to fetch user info");
                return;
            }

            // check if user exists
            const user = await db.query.users.findFirst({
                where: eq(users.oauthSub, userInfo.sub),
            });

            if (!user) {
                const isAdmin = userInfo.groups?.includes && userInfo.groups.includes("Administrators");
                // create a new user
                const { id: userId } = (
                    await db
                        .insert(users)
                        .values({
                            oauthSub: userInfo.sub,
                            username: userInfo.nickname,
                            commonName: userInfo.name,
                            mayRemoveCheckins: isAdmin,
                            mayEditTypes: isAdmin,
                        })
                        .returning({ id: users.id })
                )[0];

                // create a session token
                const sessionToken = await token();
                res.cookie("token", sessionToken, { httpOnly: true, secure: true });

                await db.insert(tokens).values({
                    user: userId,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // now + 1 hour
                    token: sessionToken,
                });

                res.status(200).send(`Login success\n---\nData:\n${JSON.stringify(userInfo, null, 2)}\n\n---`);
                return;
            }

            // update existing user
            const isAdmin = userInfo.groups?.includes && userInfo.groups.includes("Administrators");
            await db
                .update(users)
                .set({
                    username: userInfo.nickname,
                    commonName: userInfo.name,
                    mayRemoveCheckins: isAdmin,
                    mayEditTypes: isAdmin,
                })
                .where(eq(users.oauthSub, userInfo.sub));
            const sessionToken = await token();
            res.cookie("token", sessionToken, { httpOnly: true, secure: true });
            await db.insert(tokens).values({
                user: user.id,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // now + 1 hour
                token: sessionToken,
            });
            res.status(200).send(`Login success\n---\nData:\n${JSON.stringify(userInfo, null, 2)}\n\n---`);
            return;
        } catch (error) {
            console.error(error);
            res.status(500).send("Server Error: Try again later");
        }
    });

    app.get("/dashboard", async (req, res) => {
        try {
            const token = req.cookies.token;
            if (!token) {
                res.redirect("/login");
                return;
            }

            const user = await db.query.users.findFirst({
                where: eq(users.id, token.userId),
            });

            if (!user) {
                res.redirect("/login");
                return;
            }

            res.render("dashboard", { user });
        } catch (error) {
            console.error(error);
            res.status(500).send("Authentication failed");
        }
    });

    return app;
}
