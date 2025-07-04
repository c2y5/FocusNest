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
      cancelTaskBtn: document.querySelector(".cancel-task-btn")
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
      this.renderTasks();
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  renderTasks() {
    this.elements.tasksList.innerHTML = "";
    
    this.tasks.forEach(task => {
      const taskElement = document.createElement("div");
      taskElement.className = "task-item";
      
      const checkbox = document.createElement('input');
      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = task.completed;
      
      const taskText = document.createElement("span");
      taskText.className = `task-text ${task.completed ? "completed" : ""}`;
      taskText.textContent = task.title;
      
      const taskActions = document.createElement('div');
      taskActions.className = "task-actions";
      
      const editBtn = document.createElement('button');
      editBtn.className = "task-btn edit-btn";
      editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = "task-btn delete-btn";
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      
      taskActions.appendChild(editBtn);
      taskActions.appendChild(deleteBtn);
      taskElement.appendChild(checkbox);
      taskElement.appendChild(taskText);
      taskElement.appendChild(taskActions);
      
      checkbox.addEventListener("change", () => this.toggleTaskComplete(task._id, task.completed));
      editBtn.addEventListener("click", () => {
        this.currentEditId = task._id;
        this.showTaskInput(task.title);
      });
      
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.deleteTask(task._id);
      });

      this.elements.tasksList.appendChild(taskElement);
    });
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const tasksHandler = new TasksHandler();
});