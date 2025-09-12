"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Job, Profile } from "@/utils/mockData"
import { DataTableColumnHeader } from "../data-table/DataTableColumnHeader"
import { Badge } from "@/components/ui/badge"
import { getDisplayStatus, getStatusColorClass } from "@/lib/utils/statusUtils"
import { format, parseISO } from "date-fns"
import { formatAddressPart, formatPostcode, formatGBPDisplay } from "@/lib/utils/formatUtils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Eye, Truck, FileText, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

interface GetColumnsProps {
  profiles: Profile[];
  onStatusUpdate: (job: Job) => void;
  onJobView: (orderNumber: string) => void;
  onAssignDriver: (job: Job) => void;
  onViewAttachments: (job: Job) => void;
  onCancelJob: (job: Job) => void; // New prop for cancelling a job
}

export const getColumns = ({
  profiles,
  onStatusUpdate,
  onJobView,
  onAssignDriver,
  onViewAttachments,
  onCancelJob, // New prop
}: GetColumnsProps): ColumnDef<Job>[] => {
  const { userRole } = useAuth();
  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';

  return [
    {
      accessorKey: "order_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order #" />
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("order_number")}</div>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={cn("text-xs capitalize", getStatusColorClass(status))}
            variant="secondary"
          >
            {getDisplayStatus(status)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "date_created",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const dateCreated = row.getValue("date_created") as string | null | undefined;
        if (!dateCreated) return <span>N/A</span>;
        const date = parseISO(dateCreated);
        return <span>{format(date, "dd/MM/yyyy")}</span>;
      },
    },
    {
      accessorKey: "collection",
      header: "Collection",
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="text-xs">
            <p className="font-semibold">{job.collection_name || 'N/A'}</p>
            <p>{formatAddressPart(job.collection_city)}, {formatPostcode(job.collection_postcode)}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "delivery",
      header: "Delivery",
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="text-xs">
            <p className="font-semibold">{job.delivery_name || 'N/A'}</p>
            <p>{formatAddressPart(job.delivery_city)}, {formatPostcode(job.delivery_postcode)}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "assigned_driver_id",
      header: "Driver",
      cell: ({ row }) => {
        const driverId = row.getValue("assigned_driver_id") as string;
        const driver = profiles.find(p => p.id === driverId);
        return driver ? (
          <div className="text-xs">
            <p className="font-semibold">{driver.full_name}</p>
            <p>{driver.truck_reg || 'N/A'}</p>
          </div>
        ) : (
          <span className="text-xs text-gray-500">Unassigned</span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"));
        return <div className="font-medium">{formatGBPDisplay(price)}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const job = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white shadow-lg rounded-md">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onJobView(job.order_number)}>
                <Eye className="mr-2 h-4 w-4" />
                View Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAttachments(job)}>
                <FileText className="mr-2 h-4 w-4" />
                View Attachments
              </DropdownMenuItem>
              {isOfficeOrAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStatusUpdate(job)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignDriver(job)}>
                    <Truck className="mr-2 h-4 w-4" />
                    Change Driver
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => onCancelJob(job)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Job
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};