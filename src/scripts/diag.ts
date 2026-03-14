const apiKey = "AIzaSyA87ITtYlaGZUQxlF1Bnzxbhan_1loOoV8"; // Hardcoded for this diagnostic
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function check() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("AVAILABLE MODELS:");
    if (data.models) {
      data.models.forEach((m: any) => console.log(`- ${m.name}`));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

check();
