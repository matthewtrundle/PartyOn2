/**
 * @fileoverview Delivery date and time picker with popup calendar
 * @module components/checkout/DeliveryDateTimePicker
 *
 * Calendar popup with month navigation for selecting delivery dates.
 * Excludes Sundays and past dates.
 */

'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';

interface DeliveryDateTimePickerProps {
  /** Currently selected delivery date */
  selectedDate: Date | null;
  /** Currently selected time slot */
  selectedTime: string;
  /** Special delivery instructions */
  instructions: string;
  /** Callback when date changes */
  onDateChange: (date: Date) => void;
  /** Callback when time changes */
  onTimeChange: (time: string) => void;
  /** Callback when instructions change */
  onInstructionsChange: (instructions: string) => void;
  /** Whether this is for in-store pickup vs delivery (changes copy only) */
  mode?: 'delivery' | 'pickup';
}

/** Available time slots - 10am to 9pm, every 30 minutes */
const TIME_SLOTS = [
  '10:00 AM - 11:00 AM',
  '10:30 AM - 11:30 AM',
  '11:00 AM - 12:00 PM',
  '11:30 AM - 12:30 PM',
  '12:00 PM - 1:00 PM',
  '12:30 PM - 1:30 PM',
  '1:00 PM - 2:00 PM',
  '1:30 PM - 2:30 PM',
  '2:00 PM - 3:00 PM',
  '2:30 PM - 3:30 PM',
  '3:00 PM - 4:00 PM',
  '3:30 PM - 4:30 PM',
  '4:00 PM - 5:00 PM',
  '4:30 PM - 5:30 PM',
  '5:00 PM - 6:00 PM',
  '5:30 PM - 6:30 PM',
  '6:00 PM - 7:00 PM',
  '6:30 PM - 7:30 PM',
  '7:00 PM - 8:00 PM',
  '7:30 PM - 8:30 PM',
  '8:00 PM - 9:00 PM',
];

/**
 * Check if a date is available for delivery
 * - Must be in the future (or today with available time slots)
 * - Cannot be Sunday
 */
function isDateAvailable(date: Date): boolean {
  const today = startOfDay(new Date());
  const checkDate = startOfDay(date);

  // Cannot be in the past
  if (isBefore(checkDate, today)) return false;

  // Cannot be Sunday (0 = Sunday)
  if (date.getDay() === 0) return false;

  return true;
}

/**
 * Get available time slots for a specific date
 * For today, filters out slots within 3 hours
 */
function getAvailableTimeSlots(date: Date): string[] {
  const today = startOfDay(new Date());
  const selectedDay = startOfDay(date);

  // If not today, return all time slots
  if (!isSameDay(selectedDay, today)) {
    return TIME_SLOTS;
  }

  // For today, filter out slots within 3 hours
  const now = new Date();
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  return TIME_SLOTS.filter((slot) => {
    const startTime = slot.split(' - ')[0];
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    const slotDate = new Date();
    slotDate.setHours(hour24, minutes, 0, 0);

    return slotDate.getTime() >= threeHoursFromNow.getTime();
  });
}

/**
 * Delivery date and time picker with popup calendar
 */
export default function DeliveryDateTimePicker({
  selectedDate,
  selectedTime,
  instructions,
  onDateChange,
  onTimeChange,
  onInstructionsChange,
  mode = 'delivery',
}: DeliveryDateTimePickerProps): ReactElement {
  const isPickup = mode === 'pickup';
  const noun = isPickup ? 'pickup' : 'delivery';
  const Noun = isPickup ? 'Pickup' : 'Delivery';
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTimeSlots, setShowTimeSlots] = useState(!!selectedDate);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date: Date) => {
    if (!isDateAvailable(date)) return;

    onDateChange(date);
    onTimeChange(''); // Clear time when date changes
    setShowTimeSlots(true);
    setIsCalendarOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Generate calendar days
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days: ReactElement[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      const currentDay = day;
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isAvailable = isDateAvailable(day);
      const isSunday = day.getDay() === 0;

      days.push(
        <button
          key={day.toISOString()}
          type="button"
          disabled={!isAvailable || !isCurrentMonth}
          onClick={() => handleDateSelect(currentDay)}
          className={`
            p-2 text-center text-sm rounded transition-all
            ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
            ${isCurrentMonth && !isAvailable ? 'text-gray-300 cursor-not-allowed' : ''}
            ${isCurrentMonth && isAvailable && !isSelected ? 'hover:bg-yellow-100 text-gray-900 cursor-pointer' : ''}
            ${isSelected ? 'bg-brand-yellow text-gray-900 font-semibold' : ''}
            ${isSunday && isCurrentMonth ? 'text-gray-300' : ''}
          `}
        >
          {format(day, 'd')}
        </button>
      );

      day = addDays(day, 1);
    }

    return days;
  };

  const availableSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : [];

  // Check if we can go to previous month (not before current month)
  const canGoPrevious = !isSameMonth(currentMonth, new Date()) ||
    startOfMonth(currentMonth) > startOfMonth(new Date());

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="font-heading text-xl text-gray-900 tracking-[0.1em]">
          {Noun} Schedule
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {isPickup
            ? 'Store hours: Monday - Saturday, 10AM - 9PM'
            : 'Available Monday - Saturday, 10AM - 9PM'}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 tracking-[0.1em]">
            SELECT DATE
          </label>

          {/* Date Input with Calendar Popup */}
          <div className="relative" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={`
                w-full px-4 py-3 border rounded text-left flex items-center justify-between
                transition-colors
                ${selectedDate
                  ? 'border-brand-yellow bg-yellow-50'
                  : 'border-gray-300 hover:border-brand-yellow'
                }
              `}
            >
              <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                  : `Click to select a ${noun} date`
                }
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>

            {/* Calendar Popup */}
            {isCalendarOpen && (
              <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    disabled={!canGoPrevious}
                    className={`p-2 rounded hover:bg-gray-100 ${
                      !canGoPrevious ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <h4 className="font-medium text-gray-900">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h4>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className="p-2 rounded hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className={`text-center text-xs font-medium py-1 ${
                        day === 'Sun' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendarDays()}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span className="text-gray-400">● Sundays unavailable</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time Selection */}
        {showTimeSlots && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 tracking-[0.1em]">
              SELECT TIME
            </label>
            {selectedDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => onTimeChange(slot)}
                        className={`px-3 py-2 text-sm border transition-all rounded ${
                          isSelected
                            ? 'border-brand-yellow bg-yellow-50 text-yellow-600 ring-1 ring-brand-yellow'
                            : 'border-gray-200 hover:border-brand-yellow text-gray-700'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
                  No time slots available for today. Please select a future date.
                </div>
              )
            ) : (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
                Please select a {noun} date first
              </div>
            )}
          </div>
        )}

        {/* Special Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 tracking-[0.1em]">
            {isPickup ? 'PICKUP NOTES' : 'DELIVERY INSTRUCTIONS'}{' '}
            <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border border-gray-200 rounded focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow focus:outline-none transition-colors text-sm"
            placeholder={
              isPickup
                ? 'Name on the order, vehicle description, anything else we should know...'
                : 'Gate code, building entrance, special instructions...'
            }
          />
        </div>

        {/* Selected Summary */}
        {selectedDate && selectedTime && (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">{Noun} scheduled</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')} &bull; {selectedTime}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
