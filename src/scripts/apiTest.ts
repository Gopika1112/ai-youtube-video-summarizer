async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello world", targetLanguage: "Malayalam" })
    });
    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("FETCH FAILED:", err);
  }
}

test();
