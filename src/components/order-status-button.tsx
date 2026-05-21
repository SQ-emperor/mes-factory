"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/actions/order";
import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  status: string;
  label: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
}

export function OrderStatusButton({
  orderId,
  status,
  label,
  variant = "default",
  size = "sm",
  className,
}: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setPending(true);
    try {
      await updateOrderStatus(orderId, status);
      toast.success("状态已更新");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "处理中..." : label}
    </Button>
  );
}
