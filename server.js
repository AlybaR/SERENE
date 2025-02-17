// server.js

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from 'openai';  // Utilisation de la nouvelle syntaxe du SDK (v4)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // La clé est récupérée depuis .env
});

const app = express();
app.use(bodyParser.json());

app.post('/generate-itinerary', async (req, res) => {
  const { destination, duration, interests, budget } = req.body;

  // Création d'un prompt pour GPT
  const prompt = `
    Je planifie un voyage à ${destination} pour une durée de ${duration} jours.
    Mes centres d'intérêt sont : ${interests.join(', ')}.
    Mon budget approximatif est de ${budget} euros.
    Propose-moi un itinéraire détaillé comprenant des suggestions d'activités,
    des lieux incontournables, des recommandations de restaurants et une estimation
    du temps de visite pour chaque étape.
  `;

  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7,
    });
    res.json({ itinerary: completion.data.choices[0].text.trim() });
  } catch (error) {
    console.error("Erreur lors de la génération de l'itinéraire :", error);
    res.status(500).send("Erreur lors de la génération de l'itinéraire");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
