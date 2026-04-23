import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ credits: 0 })
}

export async function POST(req: Request) {
  const body = await req.json()
  return NextResponse.json({ credits: body.credits ?? 0, ok: true })
}
