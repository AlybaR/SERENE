// script.js

// --- INITIALISATION DE LA CARTE CONSTANTE ---
function initConstantMap() {
  const mapOptions = {
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 6,
    styles: [
      { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#d3d3d3" }] },
      { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
      { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#bbbbbb" }] }
    ]
  };
  window.constantMap = new google.maps.Map(document.getElementById("plan-map"), mapOptions);
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialisation de la carte sur la page planning
  if(document.getElementById("plan-map")){
    initConstantMap();
  }
});

// --- GESTION DE LA PAGE PLANIFICATION ---
document.addEventListener('DOMContentLoaded', () => {
  const planifForm = document.getElementById('planification-form');
  if (planifForm) {
    const planStep1 = document.getElementById('plan-step-1');
    const planStep2 = document.getElementById('plan-step-2');
    const calcBaseBtn = document.getElementById('calc-base-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const baseItinResults = document.getElementById('base-itin-results');
    const planLoading = document.getElementById('plan-loading');

    calcBaseBtn.addEventListener('click', () => {
      const titre = document.getElementById('voyage-titre').value;
      const paysOrigine = document.getElementById('pays-origine').value;
      const paysDestination = document.getElementById('pays-destination').value;
      const dateDebut = document.getElementById('voyage-date-debut').value;
      const dateFin = document.getElementById('voyage-date-fin').value;
      const modeTransport = document.getElementById('mode-transport-principal').value;
      if (!titre || !paysOrigine || !paysDestination || !dateDebut || !dateFin || !modeTransport) {
        alert("Veuillez remplir tous les champs de l'étape 1.");
        return;
      }
      planLoading.style.display = 'block';
      const baseRenderer = new google.maps.DirectionsRenderer();
      baseRenderer.setMap(window.constantMap);
      const request = {
        origin: paysOrigine,
        destination: paysDestination,
        travelMode: modeTransport
      };
      window.directionsService = new google.maps.DirectionsService();
      window.directionsService.route(request, (result, status) => {
        planLoading.style.display = 'none';
        if (status === "OK") {
          baseRenderer.setDirections(result);
          let totalDuration = 0;
          result.routes[0].legs.forEach(leg => {
            totalDuration += leg.duration.value;
          });
          const durationInMinutes = Math.round(totalDuration / 60);
          baseItinResults.innerHTML = `
            <p><strong>Itinéraire de base :</strong></p>
            <p>Temps de trajet total : ${durationInMinutes} minutes</p>
          `;
        } else {
          alert("Impossible de calculer l'itinéraire de base : " + status);
        }
      });
    });

    nextStepBtn.addEventListener('click', () => {
      planStep1.style.display = 'none';
      planStep2.style.display = 'block';
      loadPlanSteps();
    });

    // Gestion des étapes détaillées
    const addStepBtn = document.getElementById('add-step-btn');
    addStepBtn.addEventListener('click', addDetailedStep);

    const calcDetailedBtn = document.getElementById('calc-detailed-btn');
    calcDetailedBtn.addEventListener('click', () => {
      const etapesContainer = document.getElementById('etapes-container');
      const stepDivs = etapesContainer.querySelectorAll('.step');
      if (stepDivs.length < 1) {
        alert("Veuillez ajouter au moins une étape principale.");
        return;
      }
      let addresses = [];
      let transportModes = [];
      let expenses = [];
      stepDivs.forEach(step => {
        const addr = step.querySelector('.step-address').value.trim();
        const transport = step.querySelector('.step-transport').value;
        const expense = parseFloat(step.querySelector('.step-expense').value) || 0;
        if (addr === "") {
          alert("Veuillez remplir toutes les adresses des étapes.");
          return;
        }
        addresses.push(addr);
        transportModes.push(transport);
        expenses.push(expense);
      });
      planLoading.style.display = 'block';
      const detailedRenderer = new google.maps.DirectionsRenderer();
      detailedRenderer.setMap(window.constantMap);
      const request = {
        origin: addresses[0],
        destination: addresses[addresses.length - 1],
        waypoints: addresses.slice(1, -1).map((addr, index) => ({
          location: addr,
          stopover: transportModes[index] !== "FLIGHT"
        })),
        travelMode: transportModes.includes("FLIGHT") ? "DRIVING" : "DRIVING"
      };
      window.directionsService.route(request, (result, status) => {
        planLoading.style.display = 'none';
        if (status === "OK") {
          detailedRenderer.setDirections(result);
          let totalDuration = 0;
          result.routes[0].legs.forEach(leg => { totalDuration += leg.duration.value; });
          const durationInMinutes = Math.round(totalDuration / 60);
          document.getElementById('detailed-itin-results').innerHTML = `
            <p><strong>Itinéraire détaillé :</strong></p>
            <p>Temps de trajet total : ${durationInMinutes} minutes</p>
            <p>Budget total estimé : € ${expenses.reduce((a, b) => a + b, 0)}</p>
          `;
          if (transportModes.includes("FLIGHT")) {
            document.getElementById('detailed-itin-results').innerHTML += `<p style="color:red;">Attention : Les segments en avion ne sont pas affichés sur Google Maps.</p>`;
          }
          generateDailySummary();
          updateBudgetOverview();
        } else {
          alert("Impossible de calculer l'itinéraire détaillé : " + status);
        }
      });
    });

    const pdfBtn = document.getElementById('generate-pdf-btn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', generatePDF);
    }
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', shareItinerary);
    }
  }
});

// Gestion des étapes et sous-étapes
function addDetailedStep() {
  const etapesContainer = document.getElementById('etapes-container');
  const stepDiv = document.createElement('div');
  stepDiv.className = 'step';
  stepDiv.draggable = true;
  stepDiv.innerHTML = `
    <input type="text" class="step-name" placeholder="Nom du lieu" required>
    <input type="date" class="step-date" required>
    <input type="text" class="step-address" placeholder="Adresse" required>
    <select class="step-type">
      <option value="Hôtel">Hôtel</option>
      <option value="Restaurant">Restaurant</option>
      <option value="Airbnb">Airbnb</option>
      <option value="Maison d'hôtes">Maison d'hôtes</option>
      <option value="Activité">Activité</option>
      <option value="Autre">Autre</option>
    </select>
    <input type="number" class="step-expense" placeholder="Coût (en €)" min="0" value="0">
    <select class="step-transport">
      <option value="DRIVING">Voiture</option>
      <option value="TRANSIT">Transport en commun</option>
      <option value="WALKING">Marche</option>
      <option value="FLIGHT">Avion</option>
    </select>
    <div class="step-buttons">
      <button type="button" class="add-substep-btn">Ajouter sous-étape</button>
      <button type="button" class="remove-step-btn">Supprimer</button>
    </div>
    <div class="substeps-container"></div>
  `;
  etapesContainer.appendChild(stepDiv);
  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    new google.maps.places.Autocomplete(stepDiv.querySelector('.step-address'));
  }
  stepDiv.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', autoSavePlanSteps);
    input.addEventListener('blur', autoSavePlanSteps);
  });
  stepDiv.querySelector('.remove-step-btn').addEventListener('click', () => {
    etapesContainer.removeChild(stepDiv);
    autoSavePlanSteps();
  });
  const addSubstepBtn = stepDiv.querySelector('.add-substep-btn');
  addSubstepBtn.addEventListener('click', () => {
    addSubStep(stepDiv);
  });
  stepDiv.addEventListener("dragstart", (e) => {
    window.draggedStep = stepDiv;
    e.dataTransfer.effectAllowed = "move";
  });
  stepDiv.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  stepDiv.addEventListener("drop", (e) => {
    e.preventDefault();
    if (window.draggedStep && window.draggedStep !== stepDiv) {
      let allSteps = Array.from(etapesContainer.querySelectorAll('.step'));
      let draggedIndex = allSteps.indexOf(window.draggedStep);
      let targetIndex = allSteps.indexOf(stepDiv);
      if (draggedIndex < targetIndex) {
        etapesContainer.insertBefore(window.draggedStep, stepDiv.nextSibling);
      } else {
        etapesContainer.insertBefore(window.draggedStep, stepDiv);
      }
      autoSavePlanSteps();
    }
  });
  autoSavePlanSteps();
}

function addSubStep(parentStep) {
  const substepsContainer = parentStep.querySelector('.substeps-container');
  const substepDiv = document.createElement('div');
  substepDiv.className = 'substep';
  substepDiv.innerHTML = `
    <input type="text" class="substep-name" placeholder="Nom de la sous-étape" required>
    <input type="date" class="substep-date" required>
    <input type="text" class="substep-address" placeholder="Adresse" required>
    <select class="substep-type">
      <option value="Visite">Visite</option>
      <option value="Repas">Repas</option>
      <option value="Activité">Activité</option>
      <option value="Autre">Autre</option>
    </select>
    <input type="number" class="substep-expense" placeholder="Coût (en €)" min="0" value="0">
    <select class="substep-transport">
      <option value="DRIVING">Voiture</option>
      <option value="TRANSIT">Transport en commun</option>
      <option value="WALKING">Marche</option>
      <option value="FLIGHT">Avion</option>
    </select>
    <button type="button" class="remove-substep-btn">Supprimer sous-étape</button>
  `;
  substepsContainer.appendChild(substepDiv);
  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    new google.maps.places.Autocomplete(substepDiv.querySelector('.substep-address'));
  }
  substepDiv.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', autoSavePlanSteps);
    input.addEventListener('blur', autoSavePlanSteps);
  });
  substepDiv.querySelector('.remove-substep-btn').addEventListener('click', () => {
    substepsContainer.removeChild(substepDiv);
    autoSavePlanSteps();
  });
  autoSavePlanSteps();
}

function autoSavePlanSteps() {
  const etapesContainer = document.getElementById('etapes-container');
  let steps = [];
  const stepDivs = etapesContainer.querySelectorAll('.step');
  stepDivs.forEach(stepDiv => {
    let stepData = {
      name: stepDiv.querySelector('.step-name').value,
      date: stepDiv.querySelector('.step-date').value,
      address: stepDiv.querySelector('.step-address').value,
      type: stepDiv.querySelector('.step-type').value,
      expense: stepDiv.querySelector('.step-expense').value,
      transport: stepDiv.querySelector('.step-transport').value,
      substeps: []
    };
    const substepsContainer = stepDiv.querySelector('.substeps-container');
    if (substepsContainer) {
      const substepDivs = substepsContainer.querySelectorAll('.substep');
      substepDivs.forEach(sub => {
        let subData = {
          name: sub.querySelector('.substep-name').value,
          date: sub.querySelector('.substep-date').value,
          address: sub.querySelector('.substep-address').value,
          type: sub.querySelector('.substep-type').value,
          expense: sub.querySelector('.substep-expense').value,
          transport: sub.querySelector('.substep-transport').value
        };
        stepData.substeps.push(subData);
      });
    }
    steps.push(stepData);
  });
  localStorage.setItem('planSteps', JSON.stringify(steps));
  updateBudgetOverview();
}

function loadPlanSteps() {
  const etapesContainer = document.getElementById('etapes-container');
  const saved = localStorage.getItem('planSteps');
  if (saved) {
    let steps = JSON.parse(saved);
    steps.forEach(stepData => {
      const stepDiv = document.createElement('div');
      stepDiv.className = 'step';
      stepDiv.draggable = true;
      stepDiv.innerHTML = `
        <input type="text" class="step-name" placeholder="Nom du lieu" required value="${stepData.name || ''}">
        <input type="date" class="step-date" required value="${stepData.date || ''}">
        <input type="text" class="step-address" placeholder="Adresse" required value="${stepData.address || ''}">
        <select class="step-type">
          <option value="Hôtel" ${stepData.type === 'Hôtel' ? 'selected' : ''}>Hôtel</option>
          <option value="Restaurant" ${stepData.type === 'Restaurant' ? 'selected' : ''}>Restaurant</option>
          <option value="Airbnb" ${stepData.type === 'Airbnb' ? 'selected' : ''}>Airbnb</option>
          <option value="Maison d'hôtes" ${stepData.type === "Maison d'hôtes" ? 'selected' : ''}>Maison d'hôtes</option>
          <option value="Activité" ${stepData.type === 'Activité' ? 'selected' : ''}>Activité</option>
          <option value="Autre" ${stepData.type === 'Autre' ? 'selected' : ''}>Autre</option>
        </select>
        <input type="number" class="step-expense" placeholder="Coût (en €)" min="0" value="${stepData.expense || 0}">
        <select class="step-transport">
          <option value="DRIVING" ${stepData.transport === 'DRIVING' ? 'selected' : ''}>Voiture</option>
          <option value="TRANSIT" ${stepData.transport === 'TRANSIT' ? 'selected' : ''}>Transport en commun</option>
          <option value="WALKING" ${stepData.transport === 'WALKING' ? 'selected' : ''}>Marche</option>
          <option value="FLIGHT" ${stepData.transport === 'FLIGHT' ? 'selected' : ''}>Avion</option>
        </select>
        <div class="step-buttons">
          <button type="button" class="add-substep-btn">Ajouter sous-étape</button>
          <button type="button" class="remove-step-btn">Supprimer</button>
        </div>
        <div class="substeps-container"></div>
      `;
      etapesContainer.appendChild(stepDiv);
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        new google.maps.places.Autocomplete(stepDiv.querySelector('.step-address'));
      }
      stepDiv.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', autoSavePlanSteps);
        input.addEventListener('blur', autoSavePlanSteps);
      });
      stepDiv.querySelector('.remove-step-btn').addEventListener('click', () => {
        etapesContainer.removeChild(stepDiv);
        autoSavePlanSteps();
      });
      const addSubstepBtn = stepDiv.querySelector('.add-substep-btn');
      addSubstepBtn.addEventListener('click', () => {
        addSubStep(stepDiv);
      });
      stepDiv.addEventListener("dragstart", (e) => {
        window.draggedStep = stepDiv;
        e.dataTransfer.effectAllowed = "move";
      });
      stepDiv.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      stepDiv.addEventListener("drop", (e) => {
        e.preventDefault();
        if (window.draggedStep && window.draggedStep !== stepDiv) {
          let allSteps = Array.from(etapesContainer.querySelectorAll('.step'));
          let draggedIndex = allSteps.indexOf(window.draggedStep);
          let targetIndex = allSteps.indexOf(stepDiv);
          if (draggedIndex < targetIndex) {
            etapesContainer.insertBefore(window.draggedStep, stepDiv.nextSibling);
          } else {
            etapesContainer.insertBefore(window.draggedStep, stepDiv);
          }
          autoSavePlanSteps();
        }
      });
      // Charger les sous-étapes si elles existent
      if (stepData.substeps && stepData.substeps.length > 0) {
        const substepsContainer = stepDiv.querySelector('.substeps-container');
        stepData.substeps.forEach(subData => {
          const substepDiv = document.createElement('div');
          substepDiv.className = 'substep';
          substepDiv.innerHTML = `
            <input type="text" class="substep-name" placeholder="Nom de la sous-étape" required value="${subData.name || ''}">
            <input type="date" class="substep-date" required value="${subData.date || ''}">
            <input type="text" class="substep-address" placeholder="Adresse" required value="${subData.address || ''}">
            <select class="substep-type">
              <option value="Visite" ${subData.type === 'Visite' ? 'selected' : ''}>Visite</option>
              <option value="Repas" ${subData.type === 'Repas' ? 'selected' : ''}>Repas</option>
              <option value="Activité" ${subData.type === 'Activité' ? 'selected' : ''}>Activité</option>
              <option value="Autre" ${subData.type === 'Autre' ? 'selected' : ''}>Autre</option>
            </select>
            <input type="number" class="substep-expense" placeholder="Coût (en €)" min="0" value="${subData.expense || 0}">
            <select class="substep-transport">
              <option value="DRIVING" ${subData.transport === 'DRIVING' ? 'selected' : ''}>Voiture</option>
              <option value="TRANSIT" ${subData.transport === 'TRANSIT' ? 'selected' : ''}>Transport en commun</option>
              <option value="WALKING" ${subData.transport === 'WALKING' ? 'selected' : ''}>Marche</option>
              <option value="FLIGHT" ${subData.transport === 'FLIGHT' ? 'selected' : ''}>Avion</option>
            </select>
            <button type="button" class="remove-substep-btn">Supprimer sous-étape</button>
          `;
          substepsContainer.appendChild(substepDiv);
          if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            new google.maps.places.Autocomplete(substepDiv.querySelector('.substep-address'));
          }
          substepDiv.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', autoSavePlanSteps);
            input.addEventListener('blur', autoSavePlanSteps);
          });
          substepDiv.querySelector('.remove-substep-btn').addEventListener('click', () => {
            substepsContainer.removeChild(substepDiv);
            autoSavePlanSteps();
          });
        });
      }
    });
  }
}

// --- Vue d’ensemble du Budget et Graphique ---
function updateBudgetOverview() {
  const saved = localStorage.getItem('planSteps');
  if (!saved) return;
  let steps = JSON.parse(saved);
  let totalCost = 0;
  let breakdown = { "Hébergement": 0, "Nourriture": 0, "Activités": 0, "Autre": 0 };
  
  steps.forEach(step => {
    const cost = parseFloat(step.expense) || 0;
    totalCost += cost;
    let type = step.type.toLowerCase();
    if (type === "hôtel" || type === "airbnb" || type === "maison d'hôtes") {
      breakdown["Hébergement"] += cost;
    } else if (type === "restaurant") {
      breakdown["Nourriture"] += cost;
    } else if (type === "activité" || type === "visite") {
      breakdown["Activités"] += cost;
    } else {
      breakdown["Autre"] += cost;
    }
    if (step.substeps && step.substeps.length > 0) {
      step.substeps.forEach(sub => {
        const subCost = parseFloat(sub.expense) || 0;
        totalCost += subCost;
        breakdown["Activités"] += subCost;
      });
    }
  });
  
  const totalBudgetElem = document.getElementById('total-budget');
  if(totalBudgetElem) {
    totalBudgetElem.textContent = "Budget total : €" + totalCost.toFixed(2);
  }
  
  const ctx = document.getElementById('cost-chart').getContext('2d');
  if (window.costChart) {
    window.costChart.destroy();
  }
  window.costChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(breakdown),
      datasets: [{
        data: Object.values(breakdown),
        backgroundColor: ['#4A90E2', '#FF9800', '#4CAF50', '#9E9E9E'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Répartition des Coûts par Catégorie' }
      }
    }
  });
  
  document.getElementById('budget-overview').style.display = 'block';
}

// --- Génération du PDF ---
function generatePDF() {
  const summaryElement = document.getElementById('daily-summary');
  if (!summaryElement) {
    alert("Aucun récapitulatif disponible !");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Planning Journalier", 14, 20);
  const summaryText = summaryElement.innerText;
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(summaryText, 180);
  doc.text(splitText, 14, 30);
  doc.save("planning_journalier.pdf");
}

// --- Partage de l'itinéraire ---
function shareItinerary() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert("Lien copié dans le presse-papiers !");
  }).catch(() => {
    alert("Erreur lors de la copie du lien.");
  });
}

// --- Génération d'itinéraire via Lia (appel à l'API backend) ---
async function generateItineraryFromPreferences(event) {
  event.preventDefault();

  // Récupération des données de l'étape 1
  const destination = document.getElementById('destination').value;
  const dateDebut = document.getElementById('date-debut').value;
  const dateFin = document.getElementById('date-fin').value;

  // Récupération des données de l'étape 2
  const duree = document.querySelector('input[name="duree"]:checked').value;
  const interests = Array.from(document.querySelectorAll('input[name="interets"]:checked')).map(el => el.value);
  const budget = document.getElementById('budget').value;
  const transports = Array.from(document.querySelectorAll('input[name="transport"]:checked')).map(el => el.value);
  const rating = document.getElementById('preference-rating').value;

  const requestData = {
    destination: destination,
    duration: duree,
    interests: interests,
    budget: budget
  };

  document.getElementById('loading').style.display = 'block';

  try {
    const response = await fetch('http://localhost:3000/generate-itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    const data = await response.json();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result-summary').style.display = 'block';
    document.getElementById('summary-content').innerText = data.itinerary;
  } catch (error) {
    console.error("Erreur lors de la génération de l'itinéraire :", error);
    document.getElementById('loading').style.display = 'none';
    alert("Une erreur est survenue lors de la génération de l'itinéraire.");
  }
}

// Écouteur pour la soumission du formulaire de préférences
document.getElementById('voyage-form').addEventListener('submit', generateItineraryFromPreferences);
