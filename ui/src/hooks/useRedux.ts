/**
 * Typed Redux hooks for use throughout the application
 * These hooks provide proper TypeScript types for dispatch and state
 */
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

/**
 * Typed useDispatch hook
 * Use this instead of plain useDispatch
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Typed useSelector hook
 * Use this instead of plain useSelector
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
