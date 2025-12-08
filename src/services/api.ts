// Service API pour communiquer avec le backend
// Utilise VITE_API_URL défini dans les variables d'environnement Vercel

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://discgolf-api-production.up.railway.app';

export interface CourseListItem {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseData {
  id: string;
  name: string;
  holes: any[];
  currentHole: number;
  past: any[];
  future: any[];
  [key: string]: any;
}

class ApiService {
  // Récupérer tous les parcours
  async getCourses(): Promise<CourseListItem[]> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des parcours:', error);
      throw error;
    }
  }

  // Récupérer un parcours spécifique
  async getCourse(id: string): Promise<CourseData> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Erreur lors de la récupération du parcours ${id}:`, error);
      throw error;
    }
  }

  // Créer un nouveau parcours
  async createCourse(courseData: CourseData): Promise<{ id: string; name: string }> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(courseData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la création du parcours:', error);
      throw error;
    }
  }

  // Mettre à jour un parcours
  async updateCourse(id: string, courseData: CourseData): Promise<{ id: string; name: string }> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(courseData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du parcours ${id}:`, error);
      throw error;
    }
  }

  // Supprimer un parcours
  async deleteCourse(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression du parcours ${id}:`, error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
