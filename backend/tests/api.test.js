// Run with: npm test
// Uses an in-memory MongoDB, so your real database is never touched.
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.NODE_ENV = "test";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");
const User = require("../models/User");

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

// Registers + logs in, returns a supertest agent that keeps the cookies
const loginAs = async (name, email, role = "Sales User") => {
  await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "password123" })
    .expect(201);
  if (role === "Admin")
    await User.updateOne({ email: email.toLowerCase() }, { role });

  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password: "password123" })
    .expect(200);
  return agent;
};

test("emails are case-insensitive", async () => {
  await loginAs("Rahul", "Rahul@Example.com");
  await request(app)
    .post("/api/auth/login")
    .send({ email: "rahul@example.com", password: "password123" })
    .expect(200);
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Dup", email: "RAHUL@example.com", password: "password123" })
    .expect(400);
});

test("/auth/me returns the logged-in user", async () => {
  const agent = await loginAs("Asha", "asha@example.com");
  const res = await agent.get("/api/auth/me").expect(200);
  expect(res.body.user).toMatchObject({ name: "Asha", role: "Sales User" });
});

test("a sales user cannot see another user's lead", async () => {
  const alice = await loginAs("Alice", "alice@example.com");
  const bob = await loginAs("Bob", "bob@example.com");

  const lead = await alice
    .post("/api/leads")
    .send({ name: "Acme", email: "acme@example.com" })
    .expect(201);

  await bob.get(`/api/leads/${lead.body._id}`).expect(404);
  await bob.delete(`/api/leads/${lead.body._id}`).expect(404);
  const list = await bob.get("/api/leads").expect(200);
  expect(list.body.leads).toHaveLength(0);
});

test("admin can create a lead for a sales user and reassign it", async () => {
  const admin = await loginAs("Admin", "admin@example.com", "Admin");
  await loginAs("Alice", "alice@example.com");
  await loginAs("Bob", "bob@example.com");

  const options = await admin.get("/api/users/sales-users/options").expect(200);
  const [alice, bob] = options.body;

  const lead = await admin
    .post("/api/leads")
    .send({ name: "Acme", email: "acme@example.com", assignedTo: alice._id })
    .expect(201);

  const moved = await admin
    .patch(`/api/leads/${lead.body._id}`)
    .send({ assignedTo: bob._id })
    .expect(200);
  expect(moved.body.assignedTo.name).toBe("Bob");
});

test("logout revokes the refresh token", async () => {
  const agent = await loginAs("Asha", "asha@example.com");

  // Grab the refresh cookie before logging out (as an attacker might)
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "asha@example.com", password: "password123" });
  const stolenCookie = login.headers["set-cookie"].find((c) =>
    c.startsWith("refreshToken="),
  );

  await agent.post("/api/auth/logout").expect(200);

  await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", stolenCookie.split(";")[0])
    .expect(401);
});
