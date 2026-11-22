const app = require("../app");
const Wallet = require("../wallet");
const http = require("node:http");

function request(path, body) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request(`${base}${path}`, {
      method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" },
    }, (response) => {
      let text = "";
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => resolve({
        status: response.statusCode,
        body: response.headers["content-type"]?.includes("application/json") ? JSON.parse(text) : text,
      }));
    });
    outgoing.on("error", reject);
    outgoing.setTimeout(2000, () => outgoing.destroy(new Error("HTTP request timed out")));
    outgoing.end(body ? JSON.stringify(body) : undefined);
  });
}

let server, base;
beforeAll(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("invalid transfers return HTTP 400 without adding a transaction", async () => {
  const response = await request("/transact", { recipient: new Wallet().publicKey, amount: -10 });
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: "Amount must be a positive safe integer." });
  expect((await request("/transactions")).body).toEqual([]);
});

test("valid transfers remain available through the HTTP API", async () => {
  const recipient = new Wallet().publicKey;
  const response = await request("/transact", { recipient, amount: 10 });
  expect(response.status).toBe(302);
  const transactions = (await request("/transactions")).body;
  expect(transactions).toHaveLength(1);
  expect(transactions[0].outputs).toContainEqual({ address: recipient, amount: 10 });
});
