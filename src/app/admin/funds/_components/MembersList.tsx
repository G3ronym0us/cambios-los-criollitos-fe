'use client';

import { UserCog, Phone, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FundGroupMemberFlat } from '@/types/fund';

interface MembersListProps {
  members: FundGroupMemberFlat[];
  canEdit: boolean;
  onEdit: (member: FundGroupMemberFlat) => void;
}

export function MembersList({ members, canEdit, onEdit }: MembersListProps) {
  if (members.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserCog className="h-5 w-5" />
          Miembros del grupo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const name = member.username ?? member.user_uuid.slice(0, 8);
            const initial = name.charAt(0).toUpperCase();
            return (
              <li
                key={member.uuid}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 sm:py-4"
              >
                <div
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                >
                  <span className="text-xs font-semibold">{initial}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{name}</span>
                    {member.is_fund_manager ? (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Gestor
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {member.whatsapp_phone ? (
                      <span className="font-mono">{member.whatsapp_phone}</span>
                    ) : (
                      <span className="italic">Sin número de socio</span>
                    )}
                  </p>
                </div>

                {canEdit ? (
                  <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
                    Editar
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
