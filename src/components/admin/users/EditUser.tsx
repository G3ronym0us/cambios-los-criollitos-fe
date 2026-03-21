import { useForm, SubmitHandler } from "react-hook-form";
import { UserUpdate, UserData } from "@/types/user";

interface EditUserProps {
  user: UserData;
  onSave: (userUuid: string, data: UserUpdate) => void;
  onCancel: () => void;
}

const EditUser: React.FC<EditUserProps> = ({ user, onSave, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UserUpdate>({
    defaultValues: {
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "",
      is_active: user.is_active,
      phone_number: user.phone_number || "",
      bio: user.bio || "",
      preferred_settlement_currency: user.preferred_settlement_currency || ""
    }
  });

  const onSubmit: SubmitHandler<UserUpdate> = (data) => {
    // Remove empty optional fields
    const cleanData: UserUpdate = {};
    if (data.full_name && data.full_name !== user.full_name) cleanData.full_name = data.full_name;
    if (data.email && data.email !== user.email) cleanData.email = data.email;
    if (data.role && data.role !== user.role) cleanData.role = data.role;
    if (data.is_active !== user.is_active) cleanData.is_active = data.is_active;
    if (data.phone_number && data.phone_number !== user.phone_number) cleanData.phone_number = data.phone_number;
    if (data.bio && data.bio !== user.bio) cleanData.bio = data.bio;
    if (data.preferred_settlement_currency !== undefined && data.preferred_settlement_currency !== (user.preferred_settlement_currency || "")) {
      cleanData.preferred_settlement_currency = data.preferred_settlement_currency || null;
    }

    onSave(user.uuid, cleanData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
          Nombre Completo
        </label>
        <input
          type="text"
          id="full_name"
          className="border border-gray-300 rounded-md p-2"
          {...register("full_name")}
        />
        {errors.full_name && (
          <span className="text-xs text-red-600">{errors.full_name.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          className="border border-gray-300 rounded-md p-2"
          {...register("email", {
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
        <label htmlFor="phone_number" className="text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          type="text"
          id="phone_number"
          className="border border-gray-300 rounded-md p-2"
          placeholder="+58 424 123 4567"
          {...register("phone_number")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className="text-sm font-medium text-gray-700">
          Biografía
        </label>
        <textarea
          id="bio"
          rows={3}
          className="border border-gray-300 rounded-md p-2"
          placeholder="Información adicional sobre el usuario..."
          {...register("bio")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="role" className="text-sm font-medium text-gray-700">
          Rol
        </label>
        <select
          id="role"
          className="border border-gray-300 rounded-md p-2"
          {...register("role")}
        >
          <option value="user">Usuario</option>
          <option value="moderator">Moderador</option>
          <option value="root">Administrador</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="preferred_settlement_currency" className="text-sm font-medium text-gray-700">
          Moneda de Liquidación Preferida
        </label>
        <select
          id="preferred_settlement_currency"
          className="border border-gray-300 rounded-md p-2"
          {...register("preferred_settlement_currency")}
        >
          <option value="">Sin preferencia</option>
          <option value="USD">USD</option>
          <option value="USDT">USDT</option>
          <option value="COP">COP</option>
          <option value="VES">VES</option>
          <option value="BRL">BRL</option>
        </select>
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

      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Guardar Cambios
        </button>
      </div>
    </form>
  );
};

export default EditUser;
