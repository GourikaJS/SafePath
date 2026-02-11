import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:7000/api/test")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div>
      <h1>SafePath</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
