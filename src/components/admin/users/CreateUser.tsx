import { useForm, SubmitHandler } from "react-hook-form";
import { UserCreate } from "@/types/user";

interface CreateUserProps {
  saveUser: (data: UserCreate) => void;
}

const CreateUser: React.FC<CreateUserProps> = ({ saveUser }) => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UserCreate>({
    defaultValues: {
      is_active: true
    }
  });

  const onSubmit: SubmitHandler<UserCreate> = (data) => {
    saveUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium text-gray-700">
          Usuario <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="username"
          className="border border-gray-300 rounded-md p-2"
          {...register("username", {
            required: "El usuario es requerido",
            minLength: {
              value: 3,
              message: "El usuario debe tener al menos 3 caracteres"
            }
          })}
        />
        {errors.username && (
          <span className="text-xs text-red-600">{errors.username.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          className="border border-gray-300 rounded-md p-2"
          {...register("email", {
            required: "El email es requerido",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Email inválido"
            }
          })}
        />
        {errors.email && (
          <span className="text-xs text-red-600">{errors.email.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
          Nombre Completo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="full_name"
          className="border border-gray-300 rounded-md p-2"
          {...register("full_name", {
            required: "El nombre completo es requerido"
          })}
        />
        {errors.full_name && (
          <span className="text-xs text-red-600">{errors.full_name.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Contraseña <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="password"
          className="border border-gray-300 rounded-md p-2"
          {...register("password", {
            required: "La contraseña es requerida",
            minLength: {
              value: 6,
              message: "La contraseña debe tener al menos 6 caracteres"
            }
          })}
        />
        {errors.password && (
          <span className="text-xs text-red-600">{errors.password.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="role" className="text-sm font-medium text-gray-700">
          Rol <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          className="border border-gray-300 rounded-md p-2"
          {...register("role", { required: "El rol es requerido" })}
        >
          <option value="">Seleccionar rol...</option>
          <option value="user">Usuario</option>
          <option value="moderator">Moderador</option>
          <option value="root">Administrador</option>
        </select>
        {errors.role && (
          <span className="text-xs text-red-600">{errors.role.message}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          className="rounded border-gray-300"
          {...register("is_active")}
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
          Usuario Activo
        </label>
      </div>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
        type="submit"
      >
        Crear Usuario
      </button>
    </form>
  );
};

export default CreateUser;