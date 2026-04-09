import { NextResponse } from "next/server";

export async function GET() {
    return new NextResponse("naverec93569b98389743ca6dd0725cd32216", {
        headers: { "Content-Type": "text/html" },
    });
}
