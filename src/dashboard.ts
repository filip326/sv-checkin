import { Router } from "express";

import db from "./db";
import { eq } from "drizzle-orm";
import { checkins, checkinTypes, users } from "./db/schema";
import { fromISOTimestamp, toISODate, toISOTimestamp } from "./utils/dates";

import { format } from "date-fns/format";
import z from "zod";

export default function dashboard() {
    const router = Router();

    router.get("/dashboard", async (req, res) => {
        if (!req.user) return res.redirect("/");

        const thisUser = await db.query.users.findFirst({
            where: eq(users.id, req.user.id),
            with: {
                checkins: {
                    where: eq(checkins.date, toISODate(new Date())),
                    columns: {
                        id: true,
                        date: true,
                        timestamp: true,
                    },
                    with: { type: { columns: { id: true, name: true } } },
                    orderBy: (checkins, { desc }) => [desc(checkins.id)],
                },
            },
        });

        if (!thisUser) return res.redirect("/");

        const checkinTypes = await db.query.checkinTypes.findMany({
            columns: {
                id: true,
                name: true,
            },
        });
        const usersFound = await db.query.users.findMany({
            columns: {
                id: true,
                username: true,
                commonName: true,
            },
        });

        // sort users
        // yourself on the top
        // other alphabetically by username
        usersFound.sort((a, b) => {
            if (a.id === thisUser.id) return -1;
            if (b.id === thisUser.id) return 1;
            return a.username.localeCompare(b.username);
        });

        // check if there is a check-in for today
        if (thisUser.checkins.length > 0) {
            res.render("dashboard", {
                user: {
                    name: thisUser.commonName,
                },
                users: usersFound.map((u, i) =>
                    i !== 0
                        ? { id: u.id, name: `${u.username} (${u.commonName})` }
                        : { id: u.id, name: `Du [${u.username}]` },
                ),
                checkinTypes: checkinTypes,
                todayCheckedIn: {
                    checkedIn: true,
                    type: thisUser.checkins[0].type.name,
                    timestamp: format(fromISOTimestamp(thisUser.checkins[0].timestamp), "HH:mm"),
                },
            });
            return;
        }

        res.render("dashboard", {
            user: {
                name: thisUser.commonName,
            },
            users: usersFound.map((u, i) =>
                i !== 0
                    ? { id: u.id, name: `${u.username} (${u.commonName})` }
                    : { id: u.id, name: `Du [${u.username}]` },
            ),
            checkinTypes: checkinTypes,
            todayCheckedIn: null,
        });
    });

    const checkinData = z.object({
        user: z.string().regex(/^[0-9]+$/),
        type: z.string().regex(/^[0-9]+$/),
        addNote: z.literal("on").optional(),
        note: z.string().max(500).optional(),
        skipMessageToMe: z.literal("on").optional(),
    });
    router.post("/checkin", async (req, res) => {
        if (!req.user) {
            res.status(401).send("Unauthorized");
            return;
        }

        const data = checkinData.safeParse(req.body);
        if (!data.success) {
            res.status(400).send("Invalid data");
            return;
        }

        // check if user and type exists
        const userExists = await db.query.users.findFirst({
            where: eq(users.id, parseInt(data.data.user)),
        });
        const typeExists = await db.query.checkinTypes.findFirst({
            where: eq(checkinTypes.id, parseInt(data.data.type)),
        });

        if (!userExists || !typeExists) {
            res.status(400).send("Invalid data");
            return;
        }

        // Insert
        await db.insert(checkins).values({
            user: parseInt(data.data.user),
            type: parseInt(data.data.type),
            checkedInBy: req.user.id,
            timestamp: toISOTimestamp(new Date()),
            date: toISODate(new Date()),
            description: data.data.addNote === "on" ? data.data.note : null,
        });

        res.redirect("/dashboard");

        // send to rocket.chat
        if (process.env.ROCKET_WEBHOOK_URI) {
            let message = `User @${userExists.username} was checked in to ${typeExists.name}`;
            if (userExists.username !== req.user.username) {
                message += ` (by ${req.user.commonName})!`;
            } else message += `!`;
            if (data.data.addNote === "on" && data.data.note) {
                message += `\nNote:\n> ${data.data.note.replace(/\n/g, "\n> ")}`;
            }

            fetch(process.env.ROCKET_WEBHOOK_URI, {
                method: "POST",
                body: JSON.stringify({
                    emoji: ":grbsv:",
                    text: message,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (
                userExists.username !== req.user.username ||
                data.data.skipMessageToMe == undefined ||
                data.data.skipMessageToMe !== "on"
            ) {
                let message;
                if (userExists.username !== req.user.username) {
                    message = `Du wurdest von @${req.user.username} in ${typeExists.name} eingecheckt.`;
                } else {
                    message = `Du hast dich in ${typeExists.name} eingecheckt.`;
                }
                if (data.data.addNote === "on" && data.data.note) {
                    message += `\nNotiz:\n> ${data.data.note.replace(/\n/g, "\n> ")}`;
                }

                fetch(process.env.ROCKET_WEBHOOK_URI, {
                    method: "POST",
                    body: JSON.stringify({
                        emoji: ":grbsv:",
                        channel: `@${userExists.username}`,
                        text: message,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            }
        }
    });

    return router;
}
