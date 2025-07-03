document.addEventListener("DOMContentLoaded", function() {
    const notesUpload = document.getElementById("notesUpload");
    const fileName = document.getElementById("fileName");
    const flashcardTopic = document.getElementById("flashcardTopic");
    const flashcardDetails = document.getElementById("flashcardDetails");
    const generateFlashcardsBtn = document.getElementById("generateFlashcards");
    const currentSetTitle = document.getElementById("currentSetTitle");
    const shuffleCardsBtn = document.getElementById("shuffleCards");
    const currentFlashcard = document.getElementById("currentFlashcard");
    const flashcardQuestion = document.getElementById("flashcardQuestion");
    const flashcardAnswer = document.getElementById("flashcardAnswer");
    const prevCardBtn = document.getElementById("prevCard");
    const nextCardBtn = document.getElementById("nextCard");
    const currentCardIndex = document.getElementById("currentCardIndex");
    const totalCards = document.getElementById("totalCards");
    const flipCardBtn = document.getElementById("flipCard");
    const knowCardBtn = document.getElementById("knowCard");
    const dontKnowCardBtn = document.getElementById("dontKnowCard");
    const masteryProgress = document.getElementById("masteryProgress");
    const knownCount = document.getElementById("knownCount");
    const totalCount = document.getElementById("totalCount");
    const masteryPercentage = document.getElementById("masteryPercentage");

    let flashcards = [];
    let currentCard = 0;
    let knownCards = new Set();
    let isFlipped = false;

    notesUpload.addEventListener("change", handleFileUpload);
    generateFlashcardsBtn.addEventListener("click", generateFlashcards);
    shuffleCardsBtn.addEventListener("click", shuffleFlashcards);
    prevCardBtn.addEventListener("click", showPreviousCard);
    nextCardBtn.addEventListener("click", showNextCard);
    flipCardBtn.addEventListener("click", flipCard);
    knowCardBtn.addEventListener("click", () => markCard(true));
    dontKnowCardBtn.addEventListener("click", () => markCard(false));
    currentFlashcard.addEventListener("click", flipCard);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            fileName.textContent = "No file chosen";
            return;
        }

        fileName.textContent = file.name;
        generateFlashcardsBtn.disabled = true;
        generateFlashcardsBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Processing...";

        const formData = new FormData();
        formData.append("file", file);

        fetch("/flashcards/generate_note", {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to generate flashcards from file");
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            flashcards = data.flashcards || [];
            currentSetTitle.textContent = data.SetName || "Untitled";
            currentCard = 0;
            knownCards = new Set();
            updateFlashcardView();
            updateProgress();
            
            if (data.SetName) {
                flashcardTopic.value = data.SetName;
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error generating flashcards from file: " + error.message);
        })
        .finally(() => {
            generateFlashcardsBtn.disabled = false;
            generateFlashcardsBtn.innerHTML = "<i class='fas fa-magic'></i> Generate with AI";
        });
    }


    function generateFlashcards() {
        const topic = flashcardTopic.value.trim();
        const details = flashcardDetails.value.trim();

        if (!topic || !details) {
            alert("Please provide both a topic and details");
            return;
        }

        generateFlashcardsBtn.disabled = true;
        generateFlashcardsBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Generating...";

        fetch("/flashcards/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                topic: topic,
                details: details
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to generate flashcards");
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            flashcards = data.flashcards || [];
            currentSetTitle.textContent = data.SetName || "Untitled";
            currentCard = 0;
            knownCards = new Set();
            updateFlashcardView();
            updateProgress();
            generateFlashcardsBtn.innerHTML = "<i class='fas fa-magic'></i> Generate with AI";
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error generating flashcards: " + error.message);
            generateFlashcardsBtn.disabled = false;
            generateFlashcardsBtn.innerHTML = "<i class='fas fa-magic'></i> Generate with AI";
        });
    }

    function updateFlashcardView() {
        if (flashcards.length === 0) {
            flashcardQuestion.textContent = 'Click "Generate" or upload notes to begin';
            flashcardAnswer.textContent = "Answer will show here";
            currentCardIndex.textContent = "0";
            totalCards.textContent = "0";
            
            [prevCardBtn, nextCardBtn, flipCardBtn, knowCardBtn, dontKnowCardBtn].forEach(btn => {
                btn.disabled = true;
            });
            return;
        }

        currentFlashcard.classList.remove("flipped");
        isFlipped = false;
        
        const card = flashcards[currentCard];
        flashcardQuestion.textContent = card.question;
        flashcardAnswer.textContent = card.answer;
        
        currentCardIndex.textContent = currentCard + 1;
        totalCards.textContent = flashcards.length;
        
        updateButtonStates();
    }

    function updateButtonStates() {
        prevCardBtn.disabled = currentCard === 0;
        nextCardBtn.disabled = currentCard === flashcards.length - 1;
        flipCardBtn.disabled = flashcards.length === 0;
        knowCardBtn.disabled = flashcards.length === 0;
        dontKnowCardBtn.disabled = flashcards.length === 0;
    }

    function flipCard() {
        if (flashcards.length === 0) return;
        
        currentFlashcard.classList.toggle("flipped");
        isFlipped = !isFlipped;
        
        updateButtonStates();
    }

    function showPreviousCard() {
        if (currentCard > 0) {
            currentCard--;
            updateFlashcardView();
        }
    }

    function showNextCard() {
        if (currentCard < flashcards.length - 1) {
            currentCard++;
            updateFlashcardView();
        }
    }

    function markCard(isKnown) {
        if (flashcards.length === 0) return;
        
        const cardId = currentCard;
        if (isKnown) {
            knownCards.add(cardId);
        } else {
            knownCards.delete(cardId);
        }
        
        updateProgress();
        
        if (currentCard < flashcards.length - 1) {
            currentCard++;
            updateFlashcardView();
        }
    }

    function updateProgress() {
        const total = flashcards.length;
        const known = knownCards.size;
        const percentage = total > 0 ? Math.round((known / total) * 100) : 0;
        
        knownCount.textContent = known;
        totalCount.textContent = total;
        masteryPercentage.textContent = `${percentage}%`;
        masteryProgress.style.width = `${percentage}%`;
    }

    function shuffleFlashcards() {
        if (flashcards.length === 0) return;
        
        for (let i = flashcards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
        }
        
        currentCard = 0;
        knownCards = new Set();
        updateFlashcardView();
        updateProgress();
    }
});