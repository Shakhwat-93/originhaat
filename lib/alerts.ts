import Swal from 'sweetalert2';

export const showSuccessAlert = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#ff6b35',
    customClass: {
      popup: 'rounded-3xl font-sans text-black shadow-xl border border-gray-100',
      confirmButton: 'rounded-xl px-6 py-2.5 font-bold text-sm bg-[#ff6b35] text-white border-0 focus:ring-0 cursor-pointer transition-all active:scale-95',
    }
  });
};

export const showErrorAlert = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#ff6b35',
    customClass: {
      popup: 'rounded-3xl font-sans text-black shadow-xl border border-gray-100',
      confirmButton: 'rounded-xl px-6 py-2.5 font-bold text-sm bg-[#ff6b35] text-white border-0 focus:ring-0 cursor-pointer transition-all active:scale-95',
    }
  });
};

export const showConfirmAlert = (title: string, text: string, confirmButtonText = 'Yes, delete it!') => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ff6b35',
    cancelButtonColor: '#ef4444',
    confirmButtonText,
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'rounded-3xl font-sans text-black shadow-xl border border-gray-100',
      confirmButton: 'rounded-xl px-6 py-2.5 font-bold text-sm bg-[#ff6b35] text-white border-0 focus:ring-0 cursor-pointer transition-all active:scale-95',
      cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-sm bg-red-600 text-white border-0 focus:ring-0 cursor-pointer transition-all active:scale-95'
    }
  });
};
