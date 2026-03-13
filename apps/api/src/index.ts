import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectionsRouter } from "./routes/connections";
import { directorsRouter } from "./routes/directors";
import { filmsRouter } from "./routes/films";
import { ingestRouter } from "./routes/ingest";
import { searchRouter } from "./routes/search";
import { shotsRouter } from "./routes/shots";

type Bindings = {
  DB: D1Database;
  FRAMES: R2Bucket;
  VECTORS: VectorizeIndex;
  API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", cors());

app.get("/", (c) => c.json({ name: "precept-api", status: "ok" }));

app.route("/api", filmsRouter);
app.route("/api", shotsRouter);
app.route("/api", searchRouter);
app.route("/api", connectionsRouter);
app.route("/api", ingestRouter);
app.route("/api", directorsRouter);

export default app;
