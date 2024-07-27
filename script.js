let state = {};
let openMenus = new Set();
const socket = io();

socket.on("state_update", (newState) => {
	state = newState;
	updateUI();
});

async function fetchState() {
	const response = await fetch("/state");
	state = await response.json();
	updateUI();
}

async function updateState() {
	await fetch("/update", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(state),
	});
}

function updateUI() {
	document.getElementById("availableCannoneers").textContent =
		state.availableCannoneers;
	document.getElementById("assignedCannoneers").textContent =
		state.assignedCannoneers;
	document.getElementById("draconicShellsCharges").textContent =
		state.draconicShellsCharges;

	const weaponTypes = document.getElementById("weaponTypes");
	weaponTypes.innerHTML = "";

	const groupedWeapons = state.weapons.reduce((acc, weapon) => {
		(acc[weapon.type] = acc[weapon.type] || []).push(weapon);
		return acc;
	}, {});

	Object.entries(groupedWeapons).forEach(([type, weapons]) => {
		const typeElement = document.createElement("div");
		typeElement.className = "weapon-type";

		const weaponList = document.createElement("div");
		weaponList.className = "weapon-list";
		if (openMenus.has(type)) {
			weaponList.style.display = "block";
		} else {
			weaponList.style.display = "none";
		}
		typeElement.innerHTML = `<h3 onclick="toggleWeaponList(${weaponList})">${type} (${weapons.length})</h3>
                                     <p>Dégâts : ${weapons[0].damage}</p>
                                     <p>Temps de Rechargement : ${weapons[0].reloadTime} tours</p>
                                     <p>Portée : ${weapons[0].range}</p>`;

		// typeElement.onclick = () => toggleWeaponList(weaponList);

		weapons.forEach((weapon) => {
			const weaponElement = document.createElement("div");
			weaponElement.className = "weapon";
			// (${weaponList.positions[weapon.id]})
			weaponElement.innerHTML = `
			                 <h4>${weapon.id} (${weapon.position})</h4> 
                             ${
									weapon.hasDraconicShells
										? `<p>Dégâts : ${weapon.damage}${
												weapon.hasDraconicShells
													? " + 3d6 feu (boulets Draconiques)"
													: ""
										  }</p> `
										: ""
								}
			                 <p>Statut : ${
									weapon.currentReload > 0
										? `Rechargement (${weapon.currentReload} tours restants)`
										: "Prêt"
								}</p>
			                 <p>Canonnier : ${
									weapon.hasCannoneer
										? "Assigné"
										: "Non Assigné"
								}</p>
			                 <button onclick="fireWeapon('${weapon.id}', '${weapon.damage} ${weapon.hasDraconicShells ? "+3d6" : ""}')" ${
				!weapon.hasCannoneer || weapon.currentReload > 0
					? "disabled"
					: ""
			}>Tirer</button>
			                 <button onclick="toggleCannoneer('${weapon.id}')">${
				weapon.hasCannoneer ? "Retirer" : "Assigner"
			} Canonnier</button>
			                 ${
									weapon.type === "Canon"
										? `<button onclick="${
												weapon.hasDraconicShells
													? "removeDraconicShells"
													: "applyDraconicShells"
										  }('${weapon.id}')">${
												weapon.hasDraconicShells
													? "Retirer"
													: "Appliquer"
										  } boulets Draconiques</button>`
										: ""
								}
			             `;
			weaponList.appendChild(weaponElement);
		});

		typeElement.addEventListener("click", (e) => {
			if (e.target.closest(".weapon") === null) {
				if (weaponList.style.display === "none") {
					weaponList.style.display = "block";
					openMenus.add(type);
				} else {
					weaponList.style.display = "none";
					openMenus.delete(type);
				}
			}
		});

		typeElement.appendChild(weaponList);
		weaponTypes.appendChild(typeElement);
	});
}

function fireWeapon(id, diceRoll) {
	const weapon = state.weapons.find((w) => w.id === id);
	if (weapon && weapon.hasCannoneer && weapon.currentReload === 0) {
		weapon.currentReload = weapon.reloadTime;

		const score = rollDice(diceRoll);
		showPopup(score);

		updateState().then(updateUI);
	}
}

function toggleCannoneer(id) {
	const weapon = state.weapons.find((w) => w.id === id);
	if (weapon) {
		if (weapon.hasCannoneer) {
			weapon.hasCannoneer = false;
			state.availableCannoneers++;
			state.assignedCannoneers--;
		} else if (state.availableCannoneers > 0) {
			weapon.hasCannoneer = true;
			state.availableCannoneers--;
			state.assignedCannoneers++;
		}
		updateState().then(updateUI);
	}
}

function toggleWeaponList(weaponList) {
	if (weaponList.style.display === "none") {
		weaponList.style.display = "block";
	} else {
		weaponList.style.display = "none";
	}
}

function nextTurn() {
	state.weapons.forEach((weapon) => {
		if (weapon.currentReload > 0 && weapon.hasCannoneer) {
			weapon.currentReload--;
		}
	});
	updateState().then(updateUI);
}

function applyDraconicShells(id) {
	const weapon = state.weapons.find((w) => w.id === id);
	if (
		weapon &&
		weapon.type === "Canon" &&
		!weapon.hasDraconicShells &&
		state.draconicShellsCharges > 0
	) {
		weapon.hasDraconicShells = true;
		state.draconicShellsCharges--;
		updateState().then(updateUI);
	}
}

function removeDraconicShells(id) {
	const weapon = state.weapons.find((w) => w.id === id);
	if (weapon && weapon.type === "Canon" && weapon.hasDraconicShells) {
		weapon.hasDraconicShells = false;
		state.draconicShellsCharges++;
		updateState().then(updateUI);
	}
}

function resetDraconicShells() {
	state.weapons.forEach((weapon) => {
		weapon.hasDraconicShells = false;
	});
	state.draconicShellsCharges = 6;
	updateState().then(updateUI);
}

function toggleDetails() {
	let details = document.getElementById("shipDetails");
	if (details.style.display === "none") {
		details.style.display = "block";
	} else {
		details.style.display = "none";
	}
}

function rollDice(diceRoll) {
    // Split the input string into parts by the '+' sign, and trim whitespace
    const parts = diceRoll.split("+").map(part => part.trim());

    let total = 0;

    // Function to evaluate each part of the expression
    function evaluatePart(part) {
        if (part.includes("d")) {
            const [numOfDice, dieType] = part.split("d").map(Number);
            let partTotal = 0;
            for (let i = 0; i < numOfDice; i++) {
                partTotal += Math.floor(Math.random() * dieType) + 1;
            }
            return partTotal;
        } else {
            // If the part is a flat number, parse and return it as an integer
            return Number(part);
        }
    }

    // Evaluate each part and sum the results
    parts.forEach(part => {
        total += evaluatePart(part);
    });

    return total;
}

function showPopup(score) {
	// Create the popup elements
	const popup = document.createElement("div");
	const closeBtn = document.createElement("span");
	const scoreDisplay = document.createElement("div");

	// Style the popup
	popup.style.position = "fixed";
	popup.style.top = "50%";
	popup.style.left = "50%";
	popup.style.transform = "translate(-50%, -50%)";
	popup.style.padding = "20px";
	popup.style.backgroundColor = "white";
	popup.style.border = "2px solid black";
	popup.style.zIndex = "1000";
	popup.style.textAlign = "center";

	// Style the close button
	closeBtn.innerHTML = "&times;";
	closeBtn.style.position = "absolute";
	closeBtn.style.top = "10px";
	closeBtn.style.right = "10px";
	closeBtn.style.cursor = "pointer";
	closeBtn.onclick = () => document.body.removeChild(popup);

	// Style the score display
	scoreDisplay.innerHTML = score;
	scoreDisplay.style.fontSize = "2em";

	// Append elements to the popup
	popup.appendChild(closeBtn);
	popup.appendChild(scoreDisplay);

	// Append popup to the body
	document.body.appendChild(popup);
}

document.addEventListener("DOMContentLoaded", fetchState);
