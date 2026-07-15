import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const customSwal = MySwal.mixin({
  customClass: {
    popup: 'glass-card border border-white/10 p-6 rounded-2xl bg-black/85 backdrop-blur-md floating-shadow-red text-white text-center select-none',
    title: 'text-xl font-bold text-white mb-2',
    htmlContainer: 'text-sm text-odizo-grey mb-4',
    confirmButton: 'px-5 py-2.5 bg-odizo-red hover:bg-odizo-red/90 text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer text-sm shadow-[0_0_15px_rgba(225,97,103,0.2)] focus:outline-none outline-none border border-transparent',
    cancelButton: 'px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer text-sm focus:outline-none outline-none ml-3',
    actions: 'flex gap-3 justify-center mt-6 w-full'
  },
  buttonsStyling: false
});

export const showSuccess = async (title: string, text: string = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'success',
    iconColor: '#4ADE80',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false
  });
};

export const showError = async (title: string, text: string = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'error',
    iconColor: '#e16167',
    confirmButtonText: 'Dismiss'
  });
};

export const showConfirm = async (
  title: string,
  text: string = '',
  confirmButtonText: string = 'Confirm',
  cancelButtonText: string = 'Cancel'
): Promise<boolean> => {
  const result = await customSwal.fire({
    title,
    text,
    icon: 'question',
    iconColor: '#FBBF24',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true
  });
  return result.isConfirmed;
};
