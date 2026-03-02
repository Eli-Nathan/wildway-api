"use strict";
/**
 * image-candidate router
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
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
        // Delete a candidate
        {
            method: 'DELETE',
            path: '/image-candidates/:id',
            handler: 'image-candidate.delete',
        },
    ],
};
exports.default = config;
