const express = require('express');
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");

const MODEL_ID = "6a80752c-7636-4415-840c-7c067e40eb1b";
const POLL_INTERVAL_MS = 1500;
const MAX_RETRIES = 30;

const mindeeHeaders = {
  Authorization: process.env.MINDEE_API_KEY,
};

router.post("/scan", async (req, res) => {
  console.log("=== START SCAN REQUEST ===");
  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: "No image provided" });

    // ── STEP 1: Enqueue ──────────────────────────────────────────────
    const form = new FormData();
    form.append("model_id", MODEL_ID);
    form.append("rag", "false");
    form.append("file", Buffer.from(base64, "base64"), {
      filename: "receipt.jpg",
      contentType: "image/jpeg",
    });

    console.log("→ Enqueueing...");
    const enqueueRes = await axios.post(
      "https://api-v2.mindee.net/v2/inferences/enqueue",
      form,
      { headers: { ...form.getHeaders(), ...mindeeHeaders } }
    );

    const pollingUrl = enqueueRes.data?.job?.polling_url;
    console.log("→ Polling URL:", pollingUrl);

    if (!pollingUrl) {
      return res.status(500).json({ error: "No polling_url", raw: enqueueRes.data });
    }

    // ── STEP 2: Poll ─────────────────────────────────────────────────
    for (let i = 0; i < MAX_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let pollRes;
      try {
        pollRes = await axios.get(pollingUrl, { headers: mindeeHeaders });
      } catch (e) {
        // 404 = job already cleaned up, stop polling
        if (e.response?.status === 404) {
          console.log(`Poll ${i + 1}: Job expired before we could read it.`);
          break;
        }
        console.error(`Poll ${i + 1} error:`, e.response?.data || e.message);
        continue;
      }

      const data = pollRes.data;

      // ✅ KEY FIX: When complete, Mindee returns { inference: {...} } not { job: {...} }
      if (data?.inference) {
        console.log(`Poll ${i + 1}: ✅ Got inference directly!`);
        const fields = data.inference?.result?.fields || {};
        return res.json(parseFields(fields));
      }

      // Still processing
      const status = data?.job?.status;
      console.log(`Poll ${i + 1}: status = ${status}`);

      if (status === "Failed") {
        return res.status(500).json({ error: "Mindee job failed", raw: data });
      }
    }

    return res.status(504).json({ error: "Timed out or job expired" });

  } catch (err) {
    console.error("Unexpected error:", err.response?.data || err.message);
    res.status(500).json({ error: "Mindee scan failed", details: err.response?.data || err.message });
  }
});

function parseFields(fields) {
  const lineItems = (fields.line_items?.items || []).map((item) => ({
    description: item.fields?.description?.value || null,
    quantity: item.fields?.quantity?.value || null,
    unit_price: item.fields?.unit_price?.value || null,
    total_price: item.fields?.total_price?.value || null,
  }));

  return {
    amount: fields.total_amount?.value || fields.total?.value || null,
    description: fields.supplier_name?.value || null,
    supplier_address: fields.supplier_address?.value || null,
    date: fields.date?.value || null,
    time: fields.time?.value || null,
    receipt_number: fields.receipt_number?.value || null,
    total_net: fields.total_net?.value || null,
    total_tax: fields.total_tax?.value || null,
    currency: fields.locale?.fields?.currency?.value || null,
    category: fields.purchase_category?.value || null,
    line_items: lineItems,
    raw: fields,
  };
}

module.exports = router;