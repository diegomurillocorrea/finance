-- Sistema en moneda única: dólar estadounidense (ISO 4217: USD)
UPDATE public.liquidity_pools
SET currency = 'USD'
WHERE currency IS DISTINCT FROM 'USD';

UPDATE public.savings_accounts
SET currency = 'USD'
WHERE currency IS DISTINCT FROM 'USD';
