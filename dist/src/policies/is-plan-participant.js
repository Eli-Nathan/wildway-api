"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Policy to check if the user is a participant of a trip plan.
 * A participant is either the owner OR a user with whom the plan has been shared and accepted.
 */
const isPlanParticipant = async (policyContext, _config, { strapi }) => {
    const user = policyContext.state.user;
    if (!user || !user.id) {
        return false;
    }
    // Ensure query and filters objects exist
    if (!policyContext.query) {
        policyContext.query = {};
    }
    if (!policyContext.query.filters) {
        policyContext.query.filters = {};
    }
    /**
     * We use an $or filter to include both owned plans and shared plans.
     * This logic works for both 'find' (listing) and 'findOne' (getting by ID).
     * In Strapi 5, when a policy injects filters, they are combined with the
     * existing query, ensuring that even if a user knows an ID, they won't
     * see the record unless it matches these filters.
     */
    const participantFilter = {
        $or: [
            { owner: { id: { $eq: user.id } } },
            {
                shares: {
                    sharedWith: { id: { $eq: user.id } },
                    status: { $eq: 'accepted' }
                }
            }
        ]
    };
    // Merge with existing filters if any
    policyContext.query.filters = {
        ...policyContext.query.filters,
        ...participantFilter
    };
    return true;
};
exports.default = isPlanParticipant;
