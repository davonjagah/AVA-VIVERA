const express = require("express");
const router = express.Router();

// Get all events
router.get("/events", (req, res) => {
  const events = [
    {
      id: 1,
      title: "SMEs Connect: Beyond Profit - Building Legacies",
      date: "2025-09-08",
      time: "9:00 AM",
      location: "Accra City Hotel",
      description:
        "Calling All SME Owners & Entrepreneurs! Are you ready to transform your business from surviving to thriving?",
      image: "/images/sme.jpeg",
      facilitator: "Ugochukwu Omeogu",
      price: "1,500 GHS",
    },
    {
      id: 2,
      title: "2025 CEO Roundtable - Lead the Business, Scale to Legacy",
      date: "2025-09-09",
      time: "9:00 AM - 3:00 PM",
      location: "Accra City Hotel",
      description:
        "The greatest shift in your business won't come from more capital or a bigger team — it'll come from you becoming a better leader.",
      image: "/images/ceo.jpg",
      facilitator: "Ugochukwu Omeogu",
      price: "2,500 GHS",
    },
    {
      id: 3,
      title: "Wealth Creation Strategies Masterclass",
      date: "2025-09-12",
      time: "10:00 AM",
      location: "Accra City Hotel",
      description:
        "Ready to transform your life and business? Join us for Wealth Creation Strategies, a premium event where you'll gain actionable insights to scale your enterprise.",
      image: "/images/wealth.jpeg",
      facilitator: "Ugochukwu Omeogu",
      price: "1,200 GHS",
    },
  ];
  res.json(events);
});

// Get single event by ID
router.get("/events/:id", (req, res) => {
  const eventId = parseInt(req.params.id);
  const events = [
    {
      id: 1,
      title: "SMEs Connect: Beyond Profit - Building Legacies",
      date: "2025-09-08",
      time: "9:00 AM",
      location: "Accra City Hotel",
      description:
        "Calling All SME Owners & Entrepreneurs! Are you ready to transform your business from surviving to thriving?",
      image: "/images/sme.jpeg",
      facilitator: "Ugochukwu Omeogu",
      price: "1,500 GHS",
    },
    {
      id: 2,
      title: "2025 CEO Roundtable - Lead the Business, Scale to Legacy",
      date: "2025-09-09",
      time: "9:00 AM - 3:00 PM",
      location: "Accra City Hotel",
      description:
        "The greatest shift in your business won't come from more capital or a bigger team — it'll come from you becoming a better leader.",
      image: "/images/ceo.jpg",
      facilitator: "Ugochukwu Omeogu",
      price: "2,500 GHS",
    },
    {
      id: 3,
      title: "Wealth Creation Strategies Masterclass",
      date: "2025-09-12",
      time: "10:00 AM",
      location: "Accra City Hotel",
      description:
        "Ready to transform your life and business? Join us for Wealth Creation Strategies, a premium event where you'll gain actionable insights to scale your enterprise.",
      image: "/images/wealth.jpeg",
      facilitator: "Ugochukwu Omeogu",
      price: "1,200 GHS",
    },
  ];

  const event = events.find((e) => e.id === eventId);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json(event);
});

module.exports = router;
