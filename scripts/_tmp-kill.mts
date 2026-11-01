import postgres from "postgres";
const sql = postgres(process.env.DIRECT_URL!, { prepare: false, connect_timeout: 10, max: 1 });
const stuck = await sql`select pid, state, wait_event, round(extract(epoch from now() - query_start))::int q_s
  from pg_stat_activity where datname = current_database() and usename = 'postgres' and application_name = 'Supavisor'
  and ((state = 'active' and wait_event = 'ClientRead') or state like 'idle in transaction%') and query_start < now() - interval '10 seconds'`;
for (const s of stuck) {
  const [r] = await sql`select pg_terminate_backend(${s.pid}) ok`;
  console.log("terminated", s.pid, `${s.q_s}s`, r.ok);
}
console.log("terminated total", stuck.length);
await sql.end({ timeout: 2 });
