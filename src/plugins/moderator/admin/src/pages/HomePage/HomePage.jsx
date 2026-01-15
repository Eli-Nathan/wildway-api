import React, { memo, useState, useEffect, useRef } from "react";

import {
  fetchAllRequests,
  rejectRequest,
  approveRequest,
} from "../../utils/api";

import RequestsTable from "../../components/RequestsTable";

import { Page } from "@strapi/strapi/admin";
import { Check } from "@strapi/icons";
import { Box, Dialog, Button, Flex, Typography } from "@strapi/design-system";
import { Layouts } from "@strapi/strapi/admin";

const HomePage = () => {
  const requests = useRef({});

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmRejectDialogOpen, setIsConfirmRejectDialogOpen] =
    useState(false);
  const [rejectItem, setRejectItem] = useState({});
  const [isConfirmApproveDialogOpen, setIsConfirmApproveDialogOpen] =
    useState(false);
  const [approveItem, setApproveItem] = useState({});
  const [initialSelectedTabIndex, setInitialSelectedTabIndex] = useState(0);

  const confirmReject = (collection, id) => {
    setIsConfirmRejectDialogOpen(true);
    setRejectItem({
      collection,
      id,
    });
  };

  const confirmApprove = (collection, id) => {
    setIsConfirmApproveDialogOpen(true);
    setApproveItem({
      collection,
      id,
    });
  };

  const approve = async () => {
    setIsConfirmApproveDialogOpen(false);
    setIsLoading(true);
    await approveRequest(approveItem.collection, approveItem.id);
    requests.current = await fetchAllRequests();
    if (approveItem.collection === "edit-request") {
      setInitialSelectedTabIndex(1);
    } else if (approveItem.collection === "comment") {
      setInitialSelectedTabIndex(2);
    }
    setIsLoading(false);
  };

  const reject = async () => {
    setIsConfirmRejectDialogOpen(false);
    setIsLoading(true);
    await rejectRequest(rejectItem.collection, rejectItem.id);
    requests.current = await fetchAllRequests();
    if (rejectItem.collection === "edit-request") {
      setInitialSelectedTabIndex(1);
    } else if (approveItem.collection === "comment") {
      setInitialSelectedTabIndex(2);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const loadRequests = async () => {
      requests.current = await fetchAllRequests();
      setIsLoading(false);
    };
    loadRequests();
  }, []);

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <>
      <Box background="neutral100">
        <Layouts.Header
          title="Moderator"
          subtitle="Moderate addition and edit requests"
          as="h2"
        />
      </Box>

      <RequestsTable
        requests={requests.current}
        rejectRequest={confirmReject}
        approveRequest={confirmApprove}
        initialSelectedTabIndex={initialSelectedTabIndex}
      />

      <Dialog.Root open={isConfirmRejectDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRejectItem({});
        }
        setIsConfirmRejectDialogOpen(open);
      }}>
        <Dialog.Content>
          <Dialog.Header>Confirm Rejection</Dialog.Header>
          <Dialog.Body>
            <Typography>This will reject this request</Typography>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button variant="tertiary">Cancel</Button>
            </Dialog.Cancel>
            <Dialog.Action>
              <Button variant="success-light" startIcon={<Check />} onClick={reject}>
                Confirm
              </Button>
            </Dialog.Action>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isConfirmApproveDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setApproveItem({});
        }
        setIsConfirmApproveDialogOpen(open);
      }}>
        <Dialog.Content>
          <Dialog.Header>Confirm Approval</Dialog.Header>
          <Dialog.Body>
            <Typography>This will approve this request</Typography>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button variant="tertiary">Cancel</Button>
            </Dialog.Cancel>
            <Dialog.Action>
              <Button variant="success-light" startIcon={<Check />} onClick={approve}>
                Confirm
              </Button>
            </Dialog.Action>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default memo(HomePage);
