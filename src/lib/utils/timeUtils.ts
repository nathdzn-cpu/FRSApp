export const formatAndValidateTimeInput = (input: string): { formattedTime: string | null; error: string | null } => {
  if (!input) {
    return { formattedTime: null, error: "Time is required." };
  }

  let cleanedInput = input.replace(/[^0-9]/g, ''); // Remove non-numeric characters

  // Handle shorthand inputs
  if (cleanedInput.length === 1) { // e.g., "7" -> "07:00"
    cleanedInput = `${cleanedInput}00`;
  } else if (cleanedInput.length === 3) { // e.g., "730" -> "07:30"
    cleanedInput = `0${cleanedInput}`;
  }

  if (cleanedInput.length !== 4) {
    return { formattedTime: null, error: "Invalid time format. Use HHMM or HH:MM." };
  }

  const hours = parseInt(cleanedInput.substring(0, 2), 10);
  const minutes = parseInt(cleanedInput.substring(2, 4), 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { formattedTime: null, error: "Invalid time. Hours (00-23), Minutes (00-59)." };
  }

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');

  return { formattedTime: `${formattedHours}:${formattedMinutes}`, error: null };
};