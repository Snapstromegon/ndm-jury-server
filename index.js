import "dotenv/config";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import cors from "@fastify/cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import SQL from "sql-template-strings";

const generateJuryCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getJudging = (body) => {
  const judges = {};
  for (const key in body) {
    const parts = key.split(".");
    if (parts[0] === "judges") {
      if (!judges[parts[1]]) {
        judges[parts[1]] = [];
      }
      judges[parts[1]].push(parts[2]);
    }
  }
  return judges;
};

const db = await open({
  filename: "./database.db",
  driver: sqlite3.Database,
});

await db.migrate();

const app = Fastify();

app.register(formbody);
app.register(cors, { origin: "*" });

app.post("/save", async (req, res) => {
  console.log(req.body);
  const juryCode =
    req.body.jurycode != "" ? req.body.jurycode : generateJuryCode();
  const judges = getJudging(req.body);
  await db.run(SQL`
    INSERT INTO registrations
      (firstname, lastname, team, email, judges, jurycode)
    VALUES
      (${req.body.firstname}, ${req.body.lastname}, ${req.body.team}, ${
    req.body.email
  }, json(${JSON.stringify(judges)}), ${juryCode})
    ON CONFLICT(jurycode) DO UPDATE SET
      firstname = ${req.body.firstname},
      lastname = ${req.body.lastname},
      team = ${req.body.team},
      email = ${req.body.email},
      judges = json(${JSON.stringify(judges)}),
      updated_at = CURRENT_TIMESTAMP,
      deleted = FALSE
  `);
  res.redirect(`${req.headers.referer}jury?jurycode=${juryCode}`);
});

app.post("/list", async (req, res) => {
  if (req.body.password != process.env.ADMIN_PASSWORD) {
    res.status(403);
    return;
  }
  const users = await db.all(
    SQL`SELECT * FROM registrations WHERE deleted = FALSE`
  );
  for (const user of users) {
    user.judges = JSON.parse(user.judges);
  }
  res.send(users);
});

app.post("/listDeleted", async (req, res) => {
  if (req.body.password != process.env.ADMIN_PASSWORD) {
    res.status(403);
    return;
  }
  const users = await db.all(
    SQL`SELECT * FROM registrations WHERE deleted = TRUE`
  );
  for (const user of users) {
    user.judges = JSON.parse(user.judges);
  }
  res.send(users);
});

app.get("/get/:jurycode", async (req, res) => {
  const data = await db.get(
    SQL`SELECT * FROM registrations WHERE jurycode = ${req.params.jurycode} AND deleted = FALSE`
  );
  if (data) {
    data.judges = JSON.parse(data.judges);
  }
  res.send(data || null);
});
app.post("/delete/:jurycode", async (req, res) => {
  await db.run(
    SQL`UPDATE registrations SET deleted = TRUE WHERE jurycode = ${req.params.jurycode}`
  );
  res.redirect(`${req.headers.referer}jury/admin`);
});
app.post("/restore/:jurycode", async (req, res) => {
  await db.run(
    SQL`UPDATE registrations SET deleted = FALSE WHERE jurycode = ${req.params.jurycode}`
  );
  res.redirect(`${req.headers.referer}jury/admin`);
});

app.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
