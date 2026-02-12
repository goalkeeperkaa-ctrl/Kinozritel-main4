import app from './app.js';

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] Running on http://localhost:${PORT}`);
});
