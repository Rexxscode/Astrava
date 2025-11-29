// src/data/db.js
import { loadData, saveData } from "../utils/initStorage.js";

export function getKeyUserPrefix(userId) {
  return userId ? `${userId}_` : "";
}

// convenience: return projects key (global for now)
export function getProjectsKey(userId) {
  return userId ? `projects_${userId}` : "projects";
}

export function getTasksKey(userId, projectId = null) {
  if (userId) return projectId ? `tasks_${userId}_${projectId}` : `tasks_${userId}`;
  return projectId ? `tasks_${projectId}` : "tasks_global";
}

// simple wrappers
export function loadProjects(userId) {
  return loadData(getProjectsKey(userId)) || [];
}
export function saveProjects(userId, projects) {
  return saveData(getProjectsKey(userId), projects);
}
export function loadTasks(userId, projectId) {
  return loadData(getTasksKey(userId, projectId)) || [];
}
export function saveTasks(userId, projectId, tasks) {
  return saveData(getTasksKey(userId, projectId), tasks);
}
