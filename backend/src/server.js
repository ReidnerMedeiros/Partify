require("dotenv").config();
const { app } = require("./app");

const PORT = process.env.PORT ?? 3333;

app.listen(PORT, () => {
  console.log(`Partify backend rodando em http://localhost:${PORT}`); // eslint-disable-line no-console
});
