class TasksHandler {
  constructor() {
    this.tasks = [];
    this.triggeredStreak = false;
    this.currentEditId = null;
    this.initElements();
    this.initEventListeners();
    this.loadTasks();
  }

  initElements() {
    this.elements = {
      tasksList: document.querySelector(".tasks-list"),
      addTaskBtn: document.querySelector(".add-task-btn"),
      taskInputContainer: document.querySelector(".task-input-container"),
      taskInput: document.querySelector(".task-input"),
      saveTaskBtn: document.querySelector(".save-task-btn"),
      cancelTaskBtn: document.querySelector(".cancel-task-btn"),
      completedCount: document.querySelector(".completed-count"),
      totalCount: document.querySelector(".total-count")
    };
  }

  initEventListeners() {
    this.elements.addTaskBtn.addEventListener("click", () => this.showTaskInput());
    this.elements.saveTaskBtn.addEventListener("click", () => this.saveTask());
    this.elements.cancelTaskBtn.addEventListener("click", () => this.hideTaskInput());
  }

  showTaskInput(taskText = "") {
    this.elements.taskInput.value = taskText;
    this.elements.taskInputContainer.classList.remove("hidden");
    this.elements.taskInput.focus();
  }

  hideTaskInput() {
    this.elements.taskInput.value = "";
    this.currentEditId = null;
    this.elements.taskInputContainer.classList.add("hidden");
  }

  updateTaskCounts() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(task => task.completed).length;
    
    this.elements.totalCount.textContent = totalTasks;
    this.elements.completedCount.textContent = completedTasks;
  }

  async saveTask() {
    const text = this.elements.taskInput.value.trim();
    if (!text) return;

    try {
      if (this.currentEditId !== null) {
        await this.updateTask(this.currentEditId, text);
      } else {
        await this.addTask(text);
      }
      this.hideTaskInput();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task");
    }
  }

  async addTask(text) {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: text
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to add task");
      }
      
      this.updateTaskCounts();
      await this.loadTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  }

  async updateTask(id, newText) {
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: id,
          update_data: { title: newText }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update task");
      }
      
      this.updateTaskCounts();
      await this.loadTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  async toggleTaskComplete(id, completed) {
    if (!completed && !this.triggeredStreak) {
      streakHandler.updateStreak();
    }
    
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: id,
          update_data: { completed: !completed }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update task");
      }

      this.updateTaskCounts();
      await this.loadTasks();
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  }

  async deleteTask(id) {
    const confirmed = await window.showConfirmation("Are you sure you want to delete this task?");
    if (!confirmed) return;

    try {
        const response = await fetch("/api/tasks", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                task_id: id
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || "Failed to delete task");
        }
        
        this.updateTaskCounts();
        await this.loadTasks();
    } catch (error) {
        console.error("Error deleting task:", error);
    }
  }

  async loadTasks() {
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to load tasks");
      }
      
      this.tasks = data;
      this.updateTaskCounts();
      this.renderTasks();
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  renderTasks() {
    this.elements.tasksList.innerHTML = "";

    const sortedTasks = [...this.tasks].sort((a, b) => {
        const aIndex = a.order_index !== undefined ? a.order_index : 0;
        const bIndex = b.order_index !== undefined ? b.order_index : 0;
        return aIndex - bIndex;
    });

    sortedTasks.forEach(task => {
        const taskElement = document.createElement("div");
        taskElement.className = "task-item";
        taskElement.draggable = true;
        taskElement.dataset.id = task._id;

        // Drag and drop event listeners
        taskElement.addEventListener("dragstart", (e) => {
            this.draggedItem = taskElement;
            taskElement.classList.add("dragging");
            e.dataTransfer.setDragImage(taskElement, 0, 0);
            e.dataTransfer.effectAllowed = "move";
        });

        taskElement.addEventListener("dragend", () => {
            document.querySelectorAll('.task-item').forEach(el => {
                el.classList.remove("drag-over-top", "drag-over-bottom");
            });
            taskElement.classList.remove("dragging");
            this.draggedItem = null;
        });

        taskElement.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (!this.draggedItem || taskElement === this.draggedItem) return;

            const rect = taskElement.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            taskElement.classList.remove("drag-over-top", "drag-over-bottom");

            if (e.clientY < midY) {
                taskElement.classList.add("drag-over-top");
            } else {
                taskElement.classList.add("drag-over-bottom");
            }
        });

        taskElement.addEventListener("dragleave", () => {
            taskElement.classList.remove("drag-over-top", "drag-over-bottom");
        });

        taskElement.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!this.draggedItem || taskElement === this.draggedItem) return;

            const rect = taskElement.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (e.clientY < midY) {
                this.elements.tasksList.insertBefore(this.draggedItem, taskElement);
            } else {
                this.elements.tasksList.insertBefore(
                    this.draggedItem,
                    taskElement.nextSibling
                );
            }

            this.saveNewOrder();
            taskElement.classList.remove("drag-over-top", "drag-over-bottom");
        });

        const checkboxContainer = document.createElement("label");
        checkboxContainer.className = "custom-checkbox";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;

        const checkboxVisual = document.createElement("span");
        checkboxVisual.className = "checkbox-visual";
        checkboxVisual.innerHTML = task.completed 
            ? '<i class="fas fa-check-circle"></i>' 
            : '<i class="far fa-circle"></i>';

        const taskText = document.createElement("span");
        taskText.className = `task-text ${task.completed ? "completed" : ""}`;
        taskText.textContent = task.title;

        const textWrapper = document.createElement("span");
        textWrapper.className = "text-wrapper";
        textWrapper.appendChild(taskText);


        const taskActions = document.createElement('div');
        taskActions.className = "task-actions";

        const editBtn = document.createElement('button');
        editBtn.className = "task-btn edit-btn";
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        editBtn.title = "Edit task";

        const deleteBtn = document.createElement('button');
        deleteBtn.className = "task-btn delete-btn";
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = "Delete task";

        taskActions.appendChild(editBtn);
        taskActions.appendChild(deleteBtn);

        checkbox.addEventListener("change", (e) => {
            this.toggleTaskComplete(task._id, task.completed);
            checkboxVisual.innerHTML = e.target.checked 
                ? '<i class="fas fa-check-circle"></i>' 
                : '<i class="far fa-circle"></i>';
            taskText.classList.toggle("completed", e.target.checked);
        });

        editBtn.addEventListener("click", () => {
            this.currentEditId = task._id;
            this.showTaskInput(task.title);
        });

        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await this.deleteTask(task._id);
        });

        taskElement.appendChild(checkboxContainer);
        taskElement.appendChild(taskText);
        taskElement.appendChild(taskActions);

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(checkboxVisual);

        this.elements.tasksList.appendChild(taskElement);
    });

    this.updateTaskCounts();
  }


  async saveNewOrder() {
    const taskElements = Array.from(this.elements.tasksList.children);
    const taskIds = taskElements.map(el => el.dataset.id);
    
    try {
      const response = await fetch("/api/tasks/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_ids: taskIds
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update task order");
      }
      
      this.updateTaskCounts();
      await this.loadTasks();
    } catch (error) {
      console.error("Error updating task order:", error);
    }
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const tasksHandler = new TasksHandler();
});