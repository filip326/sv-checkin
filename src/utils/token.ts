import { randomBytes } from "crypto";

// generates a token

export async function token(): Promise<string> {

    // generate a random token
    return `${randomBytes(32).toString("base64url")}`;

}