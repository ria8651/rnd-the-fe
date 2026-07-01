/**
 * Stocktakes domain model — neutral TypeScript mirror of
 * spec/stocktakes/01-domain-model.md. Field optionality follows the live GraphQL
 * contract (introspected at localhost:8000). `?`/`| null` = nullable.
 */

export type StocktakeStatus = 'NEW' | 'FINALISED';

/** Minimal references to entities owned by other verticals. */
export interface Item {
	id: string;
	code: string;
	name: string;
	unitName?: string | null;
	isVaccine: boolean;
	doses: number;
	defaultPackSize: number;
}

export interface StockLine {
	id: string;
	/** Current recorded packs — finalise validates the line snapshot against this. */
	totalNumberOfPacks: number;
	availableNumberOfPacks: number;
	packSize: number;
}

export interface Location {
	id: string;
	name: string;
	code: string;
	onHold: boolean;
}

export type ReasonOptionType =
	| 'PositiveInventoryAdjustment'
	| 'NegativeInventoryAdjustment'
	| 'OpenVialWastage'
	| 'ClosedVialWastage'
	| 'ReturnReason';

export interface ReasonOption {
	id: string;
	reason: string;
	type: ReasonOptionType;
	isActive: boolean;
}

export interface NameRef {
	id: string;
	name: string;
}

/** One counted batch within a stocktake. */
export interface StocktakeLine {
	id: string;
	stocktakeId: string;
	item: Item;
	itemId: string;
	itemName: string;
	/** The existing stock being counted; null for a newly-introduced batch. */
	stockLine?: StockLine | null;
	/** Recorded packs at line creation — drives mismatch detection. */
	snapshotNumberOfPacks: number;
	/** User-entered count. null = not yet counted. */
	countedNumberOfPacks?: number | null;
	packSize: number;
	batch?: string | null;
	expiryDate?: string | null;
	manufactureDate?: string | null;
	sellPricePerPack?: number | null;
	costPricePerPack?: number | null;
	volumePerPack?: number | null;
	comment?: string | null;
	note?: string | null;
	location?: Location | null;
	reasonOption?: ReasonOption | null;
	donorId?: string | null;
	donorName?: string | null;
	manufacturer?: NameRef | null;
	itemVariantId?: string | null;
}

/** Stocktake header. */
export interface Stocktake {
	id: string;
	stocktakeNumber: number;
	status: StocktakeStatus;
	description?: string | null;
	comment?: string | null;
	createdDatetime: string;
	finalisedDatetime?: string | null;
	isLocked: boolean;
	isInitialStocktake: boolean;
	countedBy?: string | null;
	verifiedBy?: string | null;
	stocktakeDate?: string | null;
}

export interface StocktakeWithLines extends Stocktake {
	lines: StocktakeLine[];
	lineCount: number;
}

/** Creation modes (one insert operation; mode implied by which fields are set). */
export type CreateMode = 'full' | 'filtered' | 'blank' | 'initial';

export interface CreateStocktakeInput {
	description?: string;
	comment?: string;
	// Full
	isAllItemsStocktake?: boolean;
	// Filtered
	masterListId?: string;
	locationId?: string;
	vvmStatusId?: string;
	expiresBefore?: string;
	includeAllMasterListItems?: boolean;
	// Blank / initial
	createBlankStocktake?: boolean;
	isInitialStocktake?: boolean;
}

export type SortDir = 'asc' | 'desc';
export interface StocktakeListParams {
	page?: number;
	perPage?: number;
	sortKey?: 'stocktakeNumber' | 'status' | 'createdDatetime' | 'finalisedDatetime' | 'description' | 'comment' | 'stocktakeDate';
	sortDir?: SortDir;
	status?: StocktakeStatus;
}

export interface Paginated<T> {
	totalCount: number;
	nodes: T[];
}
