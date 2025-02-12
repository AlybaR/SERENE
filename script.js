/* script.js */

// --- INITIALISATION DE GOOGLE MAPS ---
function initMap() {
    // La fonction d'initialisation de la carte est utilisée dans la page de planification.
    // Les cartes spécifiques seront créées lors des calculs d'itinéraire.
  }
  
  // --- GESTION DE LA PAGE PLANIFICATION DE VOYAGE ---
  document.addEventListener('DOMContentLoaded', () => {
    const planifForm = document.getElementById('planification-form');
    if (planifForm) {
      // Variables pour la gestion des étapes
      const planStep1 = document.getElementById('plan-step-1');
      const planStep2 = document.getElementById('plan-step-2');
      const calcBaseBtn = document.getElementById('calc-base-btn');
      const nextStepBtn = document.getElementById('next-step-btn');
      const baseItinResults = document.getElementById('base-itin-results');
      const planLoading = document.getElementById('plan-loading');
  
      // --- Étape 1 : Informations Générales ---
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
  
        // Création de la carte pour l'itinéraire de base dans la div "base-map"
        const baseMap = new google.maps.Map(document.getElementById('base-map'), {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 6
        });
        const baseRenderer = new google.maps.DirectionsRenderer();
        baseRenderer.setMap(baseMap);
        const request = {
          origin: paysOrigine,
          destination: paysDestination,
          travelMode: modeTransport
        };
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
        loadPlanSteps(); // Charger les étapes sauvegardées (si présentes)
      });
  
      // --- Étape 2 : Détails du Voyage ---
      const addStepBtn = document.getElementById('add-step-btn');
      addStepBtn.addEventListener('click', addDetailedStep);
  
      const calcDetailedBtn = document.getElementById('calc-detailed-btn');
      calcDetailedBtn.addEventListener('click', () => {
        const etapesContainer = document.getElementById('etapes-container');
        const stepDivs = etapesContainer.querySelectorAll('.step');
        if (stepDivs.length < 2) {
          alert("Veuillez ajouter au moins deux étapes (départ et arrivée).");
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
        // Création de la carte détaillée dans la div "detailed-map"
        const detailedMap = new google.maps.Map(document.getElementById('detailed-map'), {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 6
        });
        const detailedRenderer = new google.maps.DirectionsRenderer();
        detailedRenderer.setMap(detailedMap);
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
          planLoading.style.display = 'none'; // Masquer le loader dès la réponse
          if (status === "OK") {
            detailedRenderer.setDirections(result);
            let totalDuration = 0;
            result.routes[0].legs.forEach(leg => {
              totalDuration += leg.duration.value;
            });
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
    }
  });
  
  // --- Gestion détaillée des étapes (Planification) ---
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
      <button type="button" class="remove-step-btn">Supprimer</button>
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
        transport: stepDiv.querySelector('.step-transport').value
      };
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
          <button type="button" class="remove-step-btn">Supprimer</button>
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
      });
    }
  }
  
  // --- Récapitulatif Journalier ---
  function generateDailySummary() {
    const etapesContainer = document.getElementById('etapes-container');
    const stepDivs = etapesContainer.querySelectorAll('.step');
    let dailyData = {};
    stepDivs.forEach(step => {
      const date = step.querySelector('.step-date').value;
      if (date) {
        if (!dailyData[date]) {
          dailyData[date] = { steps: [], totalExpense: 0 };
        }
        dailyData[date].steps.push({
          name: step.querySelector('.step-name').value,
          address: step.querySelector('.step-address').value,
          type: step.querySelector('.step-type').value,
          expense: parseFloat(step.querySelector('.step-expense').value) || 0,
          transport: step.querySelector('.step-transport').value
        });
        dailyData[date].totalExpense += parseFloat(step.querySelector('.step-expense').value) || 0;
      }
    });
    let summaryHTML = "<h3>Récapitulatif Journalier :</h3>";
    for (let date in dailyData) {
      summaryHTML += `<div class="daily-summary">
        <h4>${date}</h4>
        <ul>`;
      dailyData[date].steps.forEach(step => {
        summaryHTML += `<li>${step.name} (${step.type}) - ${step.address} - Dépense : €${step.expense} - Transport : ${step.transport}</li>`;
      });
      summaryHTML += `</ul>
        <p><strong>Total dépensé ce jour :</strong> €${dailyData[date].totalExpense}</p>
      </div>`;
    }
    document.getElementById('daily-summary').innerHTML = summaryHTML;
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
  