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
  // TEST_MONGO_URI lets you point the tests at a throwaway local database
  // instead of downloading MongoDB (never use your real database here!)
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI);
  } else {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
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

// ---------------------------------------------------------------------------
// Features: follow-up tasks, activity edit/delete, deal edit, lead details
// ---------------------------------------------------------------------------

const HOUR = 60 * 60 * 1000;

// Logs in Alice and gives her one lead
const aliceWithLead = async () => {
  const alice = await loginAs("Alice", "alice@example.com");
  const lead = await alice
    .post("/api/leads")
    .send({ name: "Acme", email: "acme@example.com" })
    .expect(201);
  return { alice, leadId: lead.body._id };
};

test("follow-ups need a due date and record who logged them", async () => {
  const { alice, leadId } = await aliceWithLead();

  await alice
    .post("/api/activities")
    .send({ type: "Follow-ups", notes: "Call back", leadId })
    .expect(400);

  const res = await alice
    .post("/api/activities")
    .send({
      type: "Follow-ups",
      notes: "Call back",
      leadId,
      dueDate: new Date(Date.now() + HOUR).toISOString(),
    })
    .expect(201);
  expect(res.body.createdBy.name).toBe("Alice");
  expect(res.body.completed).toBe(false);
});

test("overdue follow-ups show on the lead list and the task list", async () => {
  const { alice, leadId } = await aliceWithLead();

  const task = await alice
    .post("/api/activities")
    .send({
      type: "Follow-ups",
      notes: "Send proposal",
      leadId,
      dueDate: new Date(Date.now() - HOUR).toISOString(), // already overdue
    })
    .expect(201);

  let list = await alice.get("/api/leads").expect(200);
  expect(list.body.leads[0].overdueTasks).toBe(1);

  const tasks = await alice.get("/api/activities/tasks").expect(200);
  expect(tasks.body).toHaveLength(1);
  expect(tasks.body[0].leadId.name).toBe("Acme");

  // Mark it done: it disappears from both
  const done = await alice
    .patch(`/api/activities/${task.body._id}`)
    .send({ completed: true })
    .expect(200);
  expect(done.body.completed).toBe(true);
  expect(done.body.completedAt).toBeTruthy();

  list = await alice.get("/api/leads").expect(200);
  expect(list.body.leads[0].overdueTasks).toBe(0);
  const after = await alice.get("/api/activities/tasks").expect(200);
  expect(after.body).toHaveLength(0);
});

test("activities can be edited and deleted only by the lead's owner", async () => {
  const { alice, leadId } = await aliceWithLead();
  const bob = await loginAs("Bob", "bob@example.com");

  const activity = await alice
    .post("/api/activities")
    .send({ type: "Notes", notes: "Typo hre", leadId })
    .expect(201);
  const url = `/api/activities/${activity.body._id}`;

  await bob.patch(url).send({ notes: "Hacked" }).expect(404);
  await bob.delete(url).expect(404);

  const edited = await alice
    .patch(url)
    .send({ notes: "Typo here" })
    .expect(200);
  expect(edited.body.notes).toBe("Typo here");

  // Changing a note into a follow-up requires a due date
  await alice.patch(url).send({ type: "Follow-ups" }).expect(400);

  await alice.delete(url).expect(200);
  const remaining = await alice
    .get(`/api/activities/lead/${leadId}`)
    .expect(200);
  expect(remaining.body).toHaveLength(0);
});

test("deals can be fully edited and the close date cleared", async () => {
  const { alice, leadId } = await aliceWithLead();

  const deal = await alice
    .post("/api/deals")
    .send({
      title: "Website",
      amount: 1000,
      leadId,
      expectedCloseDate: "2026-12-31",
    })
    .expect(201);
  expect(deal.body.expectedCloseDate).toContain("2026-12-31");

  const url = `/api/deals/${deal.body._id}`;
  const edited = await alice
    .patch(url)
    .send({ title: "Website v2", amount: 2500, stage: "Negotiation" })
    .expect(200);
  expect(edited.body).toMatchObject({
    title: "Website v2",
    amount: 2500,
    stage: "Negotiation",
  });

  const cleared = await alice
    .patch(url)
    .send({ expectedCloseDate: null })
    .expect(200);
  expect(cleared.body.expectedCloseDate).toBeUndefined();

  await alice.patch(url).send({ amount: -5 }).expect(400);
});

test("leads store company, source and notes, and can be marked Lost", async () => {
  const alice = await loginAs("Alice", "alice@example.com");

  const lead = await alice
    .post("/api/leads")
    .send({
      name: "Acme",
      email: "acme@example.com",
      company: "Acme Pvt Ltd",
      source: "Referral",
      notes: "Met at a conference",
    })
    .expect(201);
  expect(lead.body).toMatchObject({
    company: "Acme Pvt Ltd",
    source: "Referral",
  });

  const url = `/api/leads/${lead.body._id}`;
  await alice.patch(url).send({ source: "Carrier pigeon" }).expect(400);

  const lost = await alice
    .patch(url)
    .send({ status: "Lost", source: "" }) // "" clears the source
    .expect(200);
  expect(lost.body.status).toBe("Lost");
  expect(lost.body.source).toBeUndefined();
});
