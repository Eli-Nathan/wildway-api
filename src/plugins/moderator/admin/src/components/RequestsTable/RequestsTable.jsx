import React from "react";
import _ from "lodash";
import {
  Box,
  Typography,
  LinkButton,
  Button,
  EmptyStateLayout,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Tabs,
} from "@strapi/design-system";
import { Plus, Eye, Check, Cross } from "@strapi/icons";

const TabContent = ({
  collection,
  name,
  rejectRequest,
  approveRequest,
}) => {
  return (
    <Tabs.Content value={name}>
      {/* TABLE */}
      <Table colCount={2} rowCount={collection.length}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">Title</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">User</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Status</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {collection && !_.isEmpty(collection) ? (
            collection.map((item) => (
              <Tr key={item.id}>
                <Td>
                  <Typography textColor="neutral800">
                    {item.title || item.site?.title || 'Untitled'}
                  </Typography>
                </Td>
                <Td>
                  {item.owner?.name ? (
                    <Typography textColor="neutral800">
                      {item.owner?.name}
                    </Typography>
                  ) : (
                    <Typography textColor="neutral400">Unknown</Typography>
                  )}
                </Td>
                <Td>
                  <Typography textColor="neutral800">{item.status}</Typography>
                </Td>
                <Td>
                  <Flex justifyContent="right" alignItems="right">
                    <LinkButton
                      to={`/content-manager/collectionType/api::${name}.${name}/${item.id}`}
                      style={{ marginRight: 12 }}
                      startIcon={<Eye />}
                    >
                      View
                    </LinkButton>
                    <Button
                      onClick={() => approveRequest(name, item.id)}
                      variant="success-light"
                      startIcon={<Check />}
                      style={{ marginRight: 12 }}
                    >
                      Complete
                    </Button>
                    <Button
                      onClick={() => rejectRequest(name, item.id)}
                      variant="danger-light"
                      startIcon={<Cross />}
                    >
                      Reject
                    </Button>
                  </Flex>
                </Td>
              </Tr>
            ))
          ) : (
            <Box padding={8} background="neutral0">
              <EmptyStateLayout
                content={`You don't have any ${name}s yet...`}
              />
            </Box>
          )}
        </Tbody>
      </Table>

      {/* END TABLE */}
    </Tabs.Content>
  );
};

const TAB_VALUES = ["addition-request", "edit-request", "comment"];

const RequestsTable = ({
  requests,
  rejectRequest,
  approveRequest,
  initialSelectedTabIndex,
}) => {
  const defaultValue = TAB_VALUES[initialSelectedTabIndex] || TAB_VALUES[0];

  return (
    <Box padding={8}>
      <Tabs.Root defaultValue={defaultValue}>
        <Tabs.List aria-label="Moderation tabs">
          <Tabs.Trigger value="addition-request">
            <Typography variant="omega">Addition requests</Typography>
          </Tabs.Trigger>
          <Tabs.Trigger value="edit-request">
            <Typography variant="omega">Edit requests</Typography>
          </Tabs.Trigger>
          <Tabs.Trigger value="comment">
            <Typography variant="omega">Comments</Typography>
          </Tabs.Trigger>
        </Tabs.List>
        <TabContent
          collection={requests.additions}
          name="addition-request"
          rejectRequest={rejectRequest}
          approveRequest={approveRequest}
        />
        <TabContent
          collection={requests.edits}
          name="edit-request"
          rejectRequest={rejectRequest}
          approveRequest={approveRequest}
        />
        <TabContent
          collection={requests.comments}
          name="comment"
          rejectRequest={rejectRequest}
          approveRequest={approveRequest}
        />
      </Tabs.Root>
    </Box>
  );
};

export default RequestsTable;
