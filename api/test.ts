export default function handler(req: any, res: any) {
  res.status(200).end(JSON.stringify({ status: "ok" }));
}
