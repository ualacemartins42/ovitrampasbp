import { createClient, type User } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "ovitrampasbp@gmail.com";
const USERNAME_PATTERN = /^[a-z0-9]+(\.[a-z0-9]+)?$/;
const BAN_DURATION = "876000h";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AgentAction = "list" | "create" | "update" | "deactivate" | "activate" | "delete";
type FormRole = "agente" | "admin";

type ManageAgentBody = {
  action?: AgentAction;
  userId?: string;
  fullName?: string;
  username?: string;
  registrationNumber?: string;
  password?: string;
  role?: FormRole;
};

type AdminClient = ReturnType<typeof createClient>;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function toDbRole(role: FormRole | undefined): "ace" | "admin" {
  return role === "admin" ? "admin" : "ace";
}

function toMetaRole(role: FormRole | undefined): "agente" | "admin" {
  return role === "admin" ? "admin" : "agente";
}

function internalEmail(username: string) {
  return `${username}@ovitrampas.local`;
}

function isBanned(user: User | undefined) {
  const until = (user as User & { banned_until?: string | null }).banned_until;
  if (!until) return false;
  const date = new Date(until);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: json({ error: "Não autenticado." }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    "";

  if (!supabaseUrl || !serviceKey) {
    return { error: json({ error: "Configuração administrativa indisponível." }, 500) };
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  const callerEmail = user?.email?.trim().toLowerCase();
  if (error || !user || callerEmail !== ADMIN_EMAIL) {
    return { error: json({ error: "Apenas o administrador pode gerenciar agentes." }, 403) };
  }

  return { admin, caller: user };
}

async function listAgents(admin: AdminClient) {
  const [{ data: profiles, error: profileError }, usersResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, username, registration_number, role, is_active, updated_at")
      .order("full_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  if (profileError) {
    return json({ error: profileError.message }, 400);
  }
  if (usersResult.error) {
    return json({ error: usersResult.error.message }, 400);
  }

  const usersById = new Map((usersResult.data.users ?? []).map((item) => [item.id, item]));

  const agents = (profiles ?? []).map((profile) => {
    const user = usersById.get(profile.id);
    const email = user?.email ?? (profile.username ? internalEmail(profile.username) : null);
    const active = (profile.is_active ?? true) && !isBanned(user);
    return {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      registrationNumber: profile.registration_number,
      email,
      role: profile.role,
      isActive: active,
      protected: email?.toLowerCase() === ADMIN_EMAIL,
      updatedAt: profile.updated_at,
    };
  });

  return json({ ok: true, agents });
}

async function createAgent(admin: AdminClient, body: ManageAgentBody) {
  const fullName = body.fullName?.trim() ?? "";
  const username = body.username?.trim().toLowerCase() ?? "";
  const registrationNumber = body.registrationNumber?.trim().toUpperCase() || null;
  const password = body.password ?? "";
  const formRole = body.role === "admin" ? "admin" : "agente";

  if (!fullName || !username || !registrationNumber || password.length < 8) {
    return json(
      { error: "Informe nome completo, matrícula, usuário e senha com pelo menos 8 caracteres." },
      400,
    );
  }
  if (!USERNAME_PATTERN.test(username)) {
    return json({ error: "Usuário inválido. Use o padrão primeiro.ultimo." }, 400);
  }

  const dbRole = toDbRole(formRole);
  const email = internalEmail(username);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username,
      registration_number: registrationNumber,
      role: toMetaRole(formRole),
    },
    app_metadata: {
      role: dbRole,
    },
  });

  if (error || !data.user) {
    const alreadyExists = error?.message?.toLowerCase().includes("already been registered");
    return json(
      {
        error: alreadyExists
          ? "Já existe um agente com este usuário/login."
          : error?.message ?? "Não foi possível criar o agente.",
      },
      400,
    );
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: fullName,
    username,
    registration_number: registrationNumber,
    role: dbRole,
    is_active: true,
  });

  if (profileError) {
    const duplicated = profileError.message.toLowerCase().includes("duplicate") || profileError.code === "23505";
    return json(
      {
        error: duplicated
          ? "Já existe um agente com esta matrícula."
          : profileError.message,
        userId: data.user.id,
      },
      400,
    );
  }

  return json({
    ok: true,
    agent: {
      id: data.user.id,
      fullName,
      username,
      registrationNumber,
      email,
      role: dbRole,
      isActive: true,
      protected: false,
    },
  });
}

async function updateAgent(admin: AdminClient, body: ManageAgentBody, callerId: string) {
  const userId = body.userId?.trim() ?? "";
  if (!userId) return json({ error: "Informe o agente a ser editado." }, 400);

  const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
  if (currentError || !current.user) {
    return json({ error: "Agente não encontrado." }, 404);
  }

  const currentEmail = current.user.email?.toLowerCase() ?? "";
  if (currentEmail === ADMIN_EMAIL && userId !== callerId) {
    return json({ error: "O administrador principal não pode ser alterado." }, 403);
  }

  const fullName = body.fullName?.trim();
  const username = body.username?.trim().toLowerCase();
  const registrationNumber = typeof body.registrationNumber === "string"
    ? body.registrationNumber.trim().toUpperCase()
    : undefined;
  const password = body.password;
  const formRole = body.role;

  if (username && !USERNAME_PATTERN.test(username)) {
    return json({ error: "Usuário inválido. Use o padrão primeiro.ultimo." }, 400);
  }

  const nextUsername =
    username ??
    ((current.user.user_metadata?.username as string | undefined) ??
      currentEmail.replace(/@ovitrampas\.local$/i, ""));
  const nextFullName = fullName ?? ((current.user.user_metadata?.full_name as string | undefined) ?? "");
  const dbRole = formRole ? toDbRole(formRole) : undefined;
  const email = username ? internalEmail(username) : undefined;

  if (currentEmail === ADMIN_EMAIL && dbRole && dbRole !== "admin") {
    return json({ error: "O administrador principal não pode perder o perfil admin." }, 403);
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ...(email && email !== currentEmail ? { email, email_confirm: true } : {}),
    ...(password && password.length >= 8 ? { password } : {}),
    user_metadata: {
      full_name: nextFullName,
      username: nextUsername,
      registration_number: registrationNumber ?? current.user.user_metadata?.registration_number,
      role: formRole ? toMetaRole(formRole) : (current.user.user_metadata?.role as string | undefined) ?? "agente",
    },
    ...(dbRole ? { app_metadata: { role: dbRole } } : {}),
  });

  if (authError) {
    return json({ error: authError.message }, 400);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      ...(fullName ? { full_name: fullName } : {}),
      ...(username ? { username } : {}),
      ...(registrationNumber !== undefined ? { registration_number: registrationNumber || null } : {}),
      ...(dbRole ? { role: dbRole } : {}),
    })
    .eq("id", userId);

  if (profileError) {
    const duplicated = profileError.message.toLowerCase().includes("duplicate") || profileError.code === "23505";
    return json({
      error: duplicated ? "Já existe um agente com esta matrícula." : profileError.message,
    }, 400);
  }

  return json({ ok: true, userId, username: nextUsername, fullName: nextFullName, role: dbRole ?? null });
}

async function setAgentActive(admin: AdminClient, body: ManageAgentBody, active: boolean, callerId: string) {
  const userId = body.userId?.trim() ?? "";
  if (!userId) return json({ error: "Informe o agente." }, 400);
  if (userId === callerId) {
    return json({ error: "Você não pode alterar o próprio acesso." }, 403);
  }

  const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
  if (currentError || !current.user) {
    return json({ error: "Agente não encontrado." }, 404);
  }
  if (current.user.email?.toLowerCase() === ADMIN_EMAIL) {
    return json({ error: "O administrador principal não pode ser desativado." }, 403);
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : BAN_DURATION,
  });
  if (banError) {
    return json({ error: banError.message }, 400);
  }

  if (!active) {
    await admin.auth.admin.signOut(userId, "global").catch(() => undefined);
  }

  const { error: profileError } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (profileError) {
    return json({ error: profileError.message }, 400);
  }

  return json({ ok: true, userId, isActive: active });
}

async function deleteAgent(admin: AdminClient, body: ManageAgentBody, callerId: string) {
  const userId = body.userId?.trim() ?? "";
  if (!userId) return json({ error: "Informe o agente." }, 400);
  if (userId === callerId) {
    return json({ error: "Você não pode excluir o próprio usuário." }, 403);
  }

  const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
  if (currentError || !current.user) {
    return json({ error: "Agente não encontrado." }, 404);
  }
  if (current.user.email?.toLowerCase() === ADMIN_EMAIL) {
    return json({ error: "O administrador principal não pode ser excluído." }, 403);
  }

  const { count, error: countError } = await admin
    .from("collections")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", userId);

  if (countError) {
    return json({ error: countError.message }, 400);
  }
  if ((count ?? 0) > 0) {
    return json(
      { error: "Este agente possui coletas. Inative o acesso em vez de excluir o cadastro." },
      409,
    );
  }

  await admin.auth.admin.signOut(userId, "global").catch(() => undefined);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return json({ error: error.message }, 400);
  }

  return json({ ok: true, userId, deleted: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const auth = await requireAdmin(req);
    if ("error" in auth && auth.error) return auth.error;

    const { admin, caller } = auth as { admin: AdminClient; caller: User };
    const body = ((await req.json().catch(() => ({}))) ?? {}) as ManageAgentBody;
    const action: AgentAction = body.action ?? "create";

    switch (action) {
      case "list":
        return await listAgents(admin);
      case "create":
        return await createAgent(admin, body);
      case "update":
        return await updateAgent(admin, body, caller.id);
      case "deactivate":
        return await setAgentActive(admin, body, false, caller.id);
      case "activate":
        return await setAgentActive(admin, body, true, caller.id);
      case "delete":
        return await deleteAgent(admin, body, caller.id);
      default:
        return json({ error: "Ação inválida." }, 400);
    }
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Falha interna ao gerenciar agentes." },
      500,
    );
  }
});
