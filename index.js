require("dotenv").config();
const pg = require("pg");
const express = require("express");

const app = express();
app.use(express.json());
const client = new pg.Client(
  process.env.DATABASE_URL || `postgres://localhost/${process.env.DB_NAME}`
);

const init = async () => {
  try {
    await client.connect();
    console.log("db connected");
    let SQL = ` 
      DROP TABLE IF EXISTS Employee;
      DROP TABLE IF EXISTS Department; 
      CREATE TABLE Department (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE Employee (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        Department_id INTEGER,
        FOREIGN KEY (Department_id) REFERENCES Department(id)
      )
    `;
    await client.query(SQL);
    console.log("tables created");

    SQL = `
      INSERT INTO Department(name) VALUES('QA');
      INSERT INTO Department(name) VALUES('HR');
      INSERT INTO Employee(name, Department_id) VALUES('check the biometric clock-in for fellow employee', (SELECT id from Department WHERE name ='IT'));
      INSERT INTO Employee(name, Department_id) VALUES('stand down meeting', (SELECT id from Department WHERE name ='HR'));
    `;
    await client.query(SQL);
    console.log("tables seeded");
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`listening on port ${port}`));
  } catch (error) {
    console.error("Error:", error.message);
  }
};

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
});

app.get("/api/department", async (req, res, next) => {
  try {
    let SQL = `SELECT * FROM Department`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/employee", async (req, res, next) => {
  try {
    let SQL = `SELECT * FROM Employee`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/employee", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `INSERT INTO Employee(name, department_id) VALUES($1, $2) RETURNING *`;
    const response = await client.query(SQL, [name, department_id]);
    res.status(201).send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE route to delete an employee by ID
app.delete("/api/employee/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const SQL = `DELETE FROM Employee WHERE id = $1`;
    await client.query(SQL, [id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PUT route to update an employee by ID
app.put("/api/employee/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department_id } = req.body;
    const SQL = `UPDATE Employee SET name = $1, department_id = $2 WHERE id = $3 RETURNING *`;
    const response = await client.query(SQL, [name, department_id, id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

init();
