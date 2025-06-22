const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

let market = {
  bid: 31,
  offer: 32,
};

let quotes = {}; // { socketId: { bid, offer } }

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id); // Stuur huidige marktdata bij verbinding

  socket.emit("market update", market); // Ontvang nieuwe quote van client

  socket.on("submit quote", ({ bid, offer }) => {
    quotes[socket.id] = { bid, offer };
    updateMarket();
  }); // Ontvang order van client

  socket.on("place order", ({ side, price, quantity }) => {
    console.log(`Order: ${side} ${quantity} @ ${price}`);
    io.to(socket.id).emit("trade confirmation", {
      side,
      price,
      quantity,
    });
  });

  socket.on("disconnect", () => {
    delete quotes[socket.id];
    updateMarket();
  });
});

// Marktdata aggregeren op basis van quotes
function updateMarket() {
  const allQuotes = Object.values(quotes);
  if (allQuotes.length === 0) return;

  const bids = allQuotes.map((q) => q.bid).filter(Boolean);
  const offers = allQuotes.map((q) => q.offer).filter(Boolean);

  market.bid = bids.length ? Math.max(...bids) : null;
  market.offer = offers.length ? Math.min(...offers) : null;

  io.emit("market update", market);
}

app.get("/", (req, res) => {
  res.send("Trading server is running.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
