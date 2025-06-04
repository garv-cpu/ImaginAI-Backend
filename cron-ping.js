// cron-ping.js
import axios from 'axios';
import "dotenv/config";

// Set these to your actual backend URLs (deployed on Render)
const BASE_URL = process.env.BACKEND_URL;

const runPing = async () => {
  try {
    console.log("Ping started");

    // Simulate login
    await axios.post(`${BASE_URL}/api/user/login`, {
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    });

    // Simulate image generation
    await axios.post(`${BASE_URL}/api/image/generate`, {
      prompt: "sunset over mountains",
    });

    // Simulate Razorpay payment (optional dummy)
    await axios.post(`${BASE_URL}/api/user/pay-razor`, {
      planId: "Starter",
    }, {
      headers: {
        Authorization: `Bearer ${process.env.TEST_JWT}`, // Pre-generated dummy JWT if auth required
      },
    });

    console.log("Ping success ✅");
  } catch (error) {
    console.error("Ping failed ❌", error?.response?.data || error.message);
  }
};

runPing();
