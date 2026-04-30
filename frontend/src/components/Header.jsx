export default function Header() {
  return (
    <header style={{
      padding: "20px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #1e293b"
    }}>
      <h1 style={{ color: "#38bdf8" }}>🛡️ SafeField Intelligence</h1>
      <span style={{ color: "#22c55e", fontWeight: "bold" }}>● LIVE</span>
    </header>
  );
}
