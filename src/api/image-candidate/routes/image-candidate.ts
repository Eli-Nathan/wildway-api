/**
 * image-candidate router
 */

interface RouteConfig {
  method: string;
  path: string;
  handler: string;
  config?: {
    auth?: boolean;
    middlewares?: string[];
    policies?: string[];
  };
}

interface RoutesConfig {
  routes: RouteConfig[];
}

const config: RoutesConfig = {
  routes: [
    // Create a new candidate (used by enrichment script)
    {
      method: 'POST',
      path: '/image-candidates',
      handler: 'image-candidate.create',
    },
    // List all pending candidates
    {
      method: 'GET',
      path: '/image-candidates',
      handler: 'image-candidate.find',
    },
    // Get single candidate
    {
      method: 'GET',
      path: '/image-candidates/:id',
      handler: 'image-candidate.findOne',
    },
    // Approve a candidate - copies image to site and deletes candidate
    {
      method: 'POST',
      path: '/image-candidates/:id/approve',
      handler: 'image-candidate.approve',
    },
    // Reject a candidate - just deletes it
    {
      method: 'POST',
      path: '/image-candidates/:id/reject',
      handler: 'image-candidate.reject',
    },
    // Mark candidate as needs review (likely match for manual verification)
    {
      method: 'POST',
      path: '/image-candidates/:id/needs-review',
      handler: 'image-candidate.needsReview',
    },
    // Delete a candidate
    {
      method: 'DELETE',
      path: '/image-candidates/:id',
      handler: 'image-candidate.delete',
    },
  ],
};

export default config;
