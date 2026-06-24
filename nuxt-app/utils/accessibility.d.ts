export function quantityButtonLabel(action: string, productName: string, nextQuantity: number, locale?: string): string
export function fieldA11y(options?: {
  id?: string
  invalid?: boolean
  hint?: boolean
  describedBy?: string | string[]
}): Record<string, string>
export function activeDescendantState(expanded: boolean, controlsId?: string): Record<string, string>
export function buttonLabel(...parts: unknown[]): string
