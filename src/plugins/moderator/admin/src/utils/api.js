// ./admin/src/utils/api.js
import { getFetchClient } from "@strapi/strapi/admin";
import pluginId from "../pluginId";

const { get } = getFetchClient();

export const fetchAllRequests = async () => {
  try {
    const { data } = await get(`/${pluginId}`);
    return data;
  } catch (error) {
    return null;
  }
};

export const rejectRequest = async (type, id) => {
  try {
    const { data } = await get(`/${pluginId}/update/${type}/${id}`);
    return data;
  } catch (error) {
    return null;
  }
};

export const approveRequest = async (type, id) => {
  try {
    const { data } = await get(`/${pluginId}/approve-${type}/${id}`);
    return data;
  } catch (error) {
    return null;
  }
};
