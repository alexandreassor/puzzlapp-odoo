# Documentation ODOO - Champs lies aux Stocks

> Documentation generee automatiquement depuis l'instance ODOO Puzzl
> Date: 2026-01-07

---

## Table des matieres

1. [Vue d'ensemble](#vue-densemble)
2. [product.product - Produit](#productproduct---produit-variante)
3. [product.template - Modele de Produit](#producttemplate---modele-de-produit)
4. [product.category - Categorie](#productcategory---categorie-de-produit)
5. [stock.move - Mouvement de Stock](#stockmove---mouvement-de-stock)
6. [stock.quant - Quantite en Stock](#stockquant---quantite-en-stock-quant)
7. [stock.location - Emplacement](#stocklocation---emplacement-de-stock)
8. [stock.warehouse - Entrepot](#stockwarehouse---entrepot)
9. [stock.picking - Bon de Transfert](#stockpicking---bon-de-transfertlivraison)
10. [stock.lot - Lot/Serie](#stocklot---lotnumero-de-serie)
11. [Relations entre modeles](#relations-entre-modeles)
12. [Methodes de cout (CUMP, FIFO, Standard)](#methodes-de-cout)
13. [Exemples d'utilisation API](#exemples-dutilisation-api)

---

## Vue d'ensemble

### Architecture Stock ODOO

```
+------------------+     +------------------+     +------------------+
|  product.template|---->|  product.product |---->|   stock.quant    |
|  (Modele)        |     |  (Variante)      |     |  (Qte/Emplacement)|
+------------------+     +------------------+     +------------------+
                                  |                       |
                                  v                       v
                         +------------------+     +------------------+
                         |   stock.move     |     |  stock.location  |
                         |  (Mouvement)     |     |  (Emplacement)   |
                         +------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |  stock.picking   |
                         |  (Bon transfert) |
                         +------------------+
```

### Types d'emplacements (stock.location.usage)

| Usage | Description | Exemple |
|-------|-------------|---------|
| `supplier` | Emplacement virtuel fournisseur | Vendors |
| `customer` | Emplacement virtuel client | Customers |
| `internal` | Emplacement physique de stockage | WH/Stock |
| `inventory` | Emplacement pour ajustements | Inventory Adjustment |
| `production` | Emplacement de production | Production |
| `transit` | En transit entre entrepots | Transit Location |

---

## product.product - Produit (Variante)

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `active` | boolean | Active |  | If unchecked, it will allow you to hide the product without removing it. |
| `barcode` | char | Barcode |  | International Article Number used for product identification. |
| `default_code` | char | Internal Reference |  |  |
| `free_qty` | float | Free To Use Quantity  |  | Available quantity (computed as Quantity On Hand - reserved quantity) In a conte |
| `incoming_qty` | float | Incoming |  | Quantity of planned incoming products. In a context with a single Stock Location |
| `is_storable` | boolean | Track Inventory |  | A storable product is a product for which you manage stock. |
| `list_price` | float | Sales Price |  | Price at which the product is sold to customers. |
| `name` | char | Name | ✓ |  |
| `outgoing_qty` | float | Outgoing |  | Quantity of planned outgoing products. In a context with a single Stock Location |
| `qty_available` | float | Quantity On Hand |  | Current quantity of products. In a context with a single Stock Location, this in |
| `standard_price` | float | Cost |  | Value of the product (automatically computed in AVCO).         Used to value the |
| `tracking` | selection | Tracking | ✓ | Ensure the traceability of a storable product in your warehouse. |
| `type` | selection | Product Type | ✓ | Goods are tangible materials and merchandise you provide. A service is a non-mat |
| `virtual_available` | float | Forecasted Quantity |  | Forecast quantity (computed as Quantity On Hand - Outgoing + Incoming) In a cont |

### Champs de selection (valeurs possibles)

**tracking** (Tracking):
- `serial` = By Unique Serial Number
- `lot` = By Lots
- `none` = By Quantity

**type** (Product Type):
- `consu` = Goods
- `service` = Service
- `combo` = Combo

**activity_state** (Activity State):
- `overdue` = Overdue
- `today` = Today
- `planned` = Planned

**activity_exception_decoration** (Activity Exception Decoration):
- `warning` = Alert
- `danger` = Error

**invoice_state** (Invoice State):
- `paid` = Paid
- `open_paid` = Open and Paid
- `draft_open_paid` = Draft, Open and Paid

**service_tracking** (Create on Order):
- `no` = Nothing
- `task_global_project` = Task
- `task_in_project` = Project & Task
- `project_only` = Project

**purchase_method** (Control Policy):
- `purchase` = On ordered quantities
- `receive` = On received quantities

**cost_method** (Cost Method):
- `standard` = Standard Price
- `fifo` = First In First Out (FIFO)
- `average` = Average Cost (AVCO)

**valuation** (Valuation):
- `periodic` = Periodic (at closing)
- `real_time` = Perpetual (at invoicing)

**service_type** (Track Service):
- `manual` = Manually set quantities on order
- `milestones` = Project Milestones
- `timesheet` = Timesheets on project (one fare per SO/Project)

**expense_policy** (Re-Invoice Costs):
- `no` = No
- `cost` = At cost
- `sales_price` = Sales price

**invoice_policy** (Invoicing Policy):
- `order` = Ordered quantities
- `delivery` = Delivered quantities

**service_policy** (Service Invoicing Policy):
- `ordered_prepaid` = Prépayé/Prix fixe
- `delivered_timesheet` = Basé sur les feuilles de temps
- `delivered_manual` = Basé sur la quantité livrée (manuelle)

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `activity_calendar_event_id` | many2one | calendar.event | Next Activity Calendar Event |
| `activity_ids` | one2many | mail.activity | Activities |
| `activity_type_id` | many2one | mail.activity.type | Next Activity Type |
| `activity_user_id` | many2one | res.users | Responsible User |
| `additional_product_tag_ids` | many2many | product.tag | Variant Tags |
| `all_product_tag_ids` | many2many | product.tag | All Product Tag |
| `create_uid` | many2one | res.users | Created by |
| `message_follower_ids` | one2many | mail.followers | Followers |
| `message_ids` | one2many | mail.message | Messages |
| `message_partner_ids` | many2many | res.partner | Followers (Partners) |
| `pricelist_rule_ids` | one2many | product.pricelist.item | Pricelist Rules |
| `product_document_ids` | one2many | product.document | Documents |
| `product_template_attribute_value_ids` | many2many | product.template.attribute.value | Attribute Values |
| `product_template_variant_value_ids` | many2many | product.template.attribute.value | Variant Values |
| `product_tmpl_id` | many2one | product.template | Product Template |
| `product_uom_ids` | one2many | product.uom | Unit Barcode |
| `rating_ids` | one2many | rating.rating | Ratings |
| `stock_quant_ids` | one2many | stock.quant | Stock Quant |
| `website_message_ids` | one2many | mail.message | Website Messages |
| `write_uid` | many2one | res.users | Last Updated by |
| ... | ... | ... | (39 autres relations) |

---

## product.template - Modele de Produit

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `active` | boolean | Active |  | If unchecked, it will allow you to hide the product without removing it. |
| `default_code` | char | Internal Reference |  |  |
| `is_storable` | boolean | Track Inventory |  | A storable product is a product for which you manage stock. |
| `list_price` | float | Sales Price |  | Price at which the product is sold to customers. |
| `name` | char | Name | ✓ |  |
| `standard_price` | float | Cost |  | Value of the product (automatically computed in AVCO).         Used to value the |
| `tracking` | selection | Tracking | ✓ | Ensure the traceability of a storable product in your warehouse. |
| `type` | selection | Product Type | ✓ | Goods are tangible materials and merchandise you provide. A service is a non-mat |

### Champs de selection (valeurs possibles)

**tracking** (Tracking):
- `serial` = By Unique Serial Number
- `lot` = By Lots
- `none` = By Quantity

**type** (Product Type):
- `consu` = Goods
- `service` = Service
- `combo` = Combo

**activity_state** (Activity State):
- `overdue` = Overdue
- `today` = Today
- `planned` = Planned

**activity_exception_decoration** (Activity Exception Decoration):
- `warning` = Alert
- `danger` = Error

**service_tracking** (Create on Order):
- `no` = Nothing
- `task_global_project` = Task
- `task_in_project` = Project & Task
- `project_only` = Project

**cost_method** (Cost Method):
- `standard` = Standard Price
- `fifo` = First In First Out (FIFO)
- `average` = Average Cost (AVCO)

**valuation** (Valuation):
- `periodic` = Periodic (at closing)
- `real_time` = Perpetual (at invoicing)

**service_type** (Track Service):
- `manual` = Manually set quantities on order
- `milestones` = Project Milestones
- `timesheet` = Timesheets on project (one fare per SO/Project)

**expense_policy** (Re-Invoice Costs):
- `no` = No
- `cost` = At cost
- `sales_price` = Sales price

**invoice_policy** (Invoicing Policy):
- `order` = Ordered quantities
- `delivery` = Delivered quantities

**service_policy** (Service Invoicing Policy):
- `ordered_prepaid` = Prépayé/Prix fixe
- `delivered_timesheet` = Basé sur les feuilles de temps
- `delivered_manual` = Basé sur la quantité livrée (manuelle)

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `activity_calendar_event_id` | many2one | calendar.event | Next Activity Calendar Event |
| `activity_ids` | one2many | mail.activity | Activities |
| `activity_type_id` | many2one | mail.activity.type | Next Activity Type |
| `activity_user_id` | many2one | res.users | Responsible User |
| `attribute_line_ids` | one2many | product.template.attribute.line | Product Attributes |
| `categ_id` | many2one | product.category | Product Category |
| `combo_ids` | many2many | product.combo | Combo Choices |
| `company_id` | many2one | res.company | Company |
| `cost_currency_id` | many2one | res.currency | Cost Currency |
| `currency_id` | many2one | res.currency | Currency |
| `message_follower_ids` | one2many | mail.followers | Followers |
| `message_ids` | one2many | mail.message | Messages |
| `message_partner_ids` | many2many | res.partner | Followers (Partners) |
| `rating_ids` | one2many | rating.rating | Ratings |
| `seller_ids` | one2many | product.supplierinfo | Vendors |
| `uom_id` | many2one | uom.uom | Unit |
| `uom_ids` | many2many | uom.uom | Packagings |
| `valid_product_template_attribute_line_ids` | many2many | product.template.attribute.line | Valid Product Attribute Lines |
| `variant_seller_ids` | one2many | product.supplierinfo | Variant Seller |
| `website_message_ids` | one2many | mail.message | Website Messages |
| ... | ... | ... | (26 autres relations) |

---

## product.category - Categorie de Produit

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `name` | char | Name | ✓ |  |
| `property_cost_method` | selection | Costing Method |  | Standard Price: The products are valued at their standard cost defined on the pr |
| `property_valuation` | selection | Inventory Valuation |  | Periodic: The accounting entries are suggested manually in the inventory valuati |

### Champs de selection (valeurs possibles)

**property_cost_method** (Costing Method):
- `standard` = Standard Price
- `fifo` = First In First Out (FIFO)
- `average` = Average Cost (AVCO)

**property_valuation** (Inventory Valuation):
- `periodic` = Periodic (at closing)
- `real_time` = Perpetual (at invoicing)

**packaging_reserve_method** (Reserve Packagings):
- `full` = Reserve Only Full Packagings
- `partial` = Reserve Partial Packagings

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `account_stock_variation_id` | many2one | account.account | Stock Variation Account |
| `child_id` | one2many | product.category | Child Categories |
| `create_uid` | many2one | res.users | Created by |
| `message_follower_ids` | one2many | mail.followers | Followers |
| `message_ids` | one2many | mail.message | Messages |
| `message_partner_ids` | many2many | res.partner | Followers (Partners) |
| `parent_id` | many2one | product.category | Parent Category |
| `parent_route_ids` | many2many | stock.route | Parent Routes |
| `property_account_expense_categ_id` | many2one | account.account | Expense Account |
| `property_account_income_categ_id` | many2one | account.account | Income Account |
| `property_price_difference_account_id` | many2one | account.account | Price Difference Account |
| `property_stock_journal` | many2one | account.journal | Stock Journal |
| `property_stock_valuation_account_id` | many2one | account.account | Stock Valuation Account |
| `putaway_rule_ids` | one2many | stock.putaway.rule | Putaway Rules |
| `rating_ids` | one2many | rating.rating | Ratings |
| `removal_strategy_id` | many2one | product.removal | Force Removal Strategy |
| `route_ids` | many2many | stock.route | Routes |
| `total_route_ids` | many2many | stock.route | Total routes |
| `website_message_ids` | one2many | mail.message | Website Messages |
| `write_uid` | many2one | res.users | Last Updated by |

---

## stock.move - Mouvement de Stock

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `date` | datetime | Date Scheduled | ✓ | Scheduled date until move is done, then date of actual move processing |
| `origin` | char | Source Document |  |  |
| `price_unit` | float | Price Unit |  |  |
| `product_uom_qty` | float | Demand | ✓ | This is the quantity of product that is planned to be moved.Lowering this quanti |
| `quantity` | float | Quantity |  |  |
| `reference` | char | Reference |  |  |
| `state` | selection | Status |  | * New: The stock move is created but not confirmed. * Waiting Another Move: A li |

### Champs de selection (valeurs possibles)

**state** (Status):
- `draft` = New
- `waiting` = Waiting Another Move
- `confirmed` = Waiting
- `partially_available` = Partially Available
- `assigned` = Available
- `done` = Done
- `cancel` = Cancelled

**priority** (Priority):
- `0` = Normal
- `1` = Urgent

**location_usage** (Source Location Type):
- `supplier` = Vendor
- `view` = Virtual
- `internal` = Internal
- `customer` = Customer
- `inventory` = Inventory Loss
- `production` = Production
- `transit` = Transit

**location_dest_usage** (Destination Location Type):
- `supplier` = Vendor
- `view` = Virtual
- `internal` = Internal
- `customer` = Customer
- `inventory` = Inventory Loss
- `production` = Production
- `transit` = Transit

**procure_method** (Supply Method):
- `make_to_stock` = Default: Take From Stock
- `make_to_order` = Advanced: Apply Procurement Rules

**has_tracking** (Product with Tracking):
- `serial` = By Unique Serial Number
- `lot` = By Lots
- `none` = By Quantity

**picking_code** (Type of Operation):
- `incoming` = Receipt
- `outgoing` = Delivery
- `internal` = Internal Transfer

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `allowed_uom_ids` | many2many | uom.uom | Allowed Uom |
| `company_id` | many2one | res.company | Company |
| `location_dest_id` | many2one | stock.location | Intermediate Location |
| `location_final_id` | many2one | stock.location | Final Location |
| `location_id` | many2one | stock.location | Source Location |
| `move_dest_ids` | many2many | stock.move | Destination Moves |
| `move_line_ids` | one2many | stock.move.line | Move Line |
| `move_orig_ids` | many2many | stock.move | Original Move |
| `never_product_template_attribute_value_ids` | many2many | product.template.attribute.value | Never attribute Values |
| `package_ids` | one2many | stock.package | Packages |
| `partner_id` | many2one | res.partner | Destination Address  |
| `picking_id` | many2one | stock.picking | Transfer |
| `picking_type_id` | many2one | stock.picking.type | Operation Type |
| `product_category_id` | many2one | product.category | Product Category |
| `product_id` | many2one | product.product | Product |
| `product_tmpl_id` | many2one | product.template | Product Template |
| `product_uom` | many2one | uom.uom | Unit |
| `reference_ids` | many2many | stock.reference | References |
| `rule_id` | many2one | stock.rule | Stock Rule |
| `scrap_id` | many2one | stock.scrap | Scrap operation |
| ... | ... | ... | (14 autres relations) |

---

## stock.quant - Quantite en Stock (Quant)

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `quantity` | float | Quantity |  | Quantity of products in this quant, in the default unit of measure of the produc |
| `reserved_quantity` | float | Reserved Quantity | ✓ | Quantity of reserved products in this quant, in the default unit of measure of t |

### Champs de selection (valeurs possibles)

**tracking** (Tracking):
- `serial` = By Unique Serial Number
- `lot` = By Lots
- `none` = By Quantity

**cost_method** (Cost Method):
- `standard` = Standard Price
- `fifo` = First In First Out (FIFO)
- `average` = Average Cost (AVCO)

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `company_id` | many2one | res.company | Company |
| `create_uid` | many2one | res.users | Created by |
| `currency_id` | many2one | res.currency | Currency |
| `location_id` | many2one | stock.location | Location |
| `lot_id` | many2one | stock.lot | Lot/Serial Number |
| `owner_id` | many2one | res.partner | Owner |
| `package_id` | many2one | stock.package | Package |
| `product_categ_id` | many2one | product.category | Product Category |
| `product_id` | many2one | product.product | Product |
| `product_tmpl_id` | many2one | product.template | Product Template |
| `product_uom_id` | many2one | uom.uom | Unit |
| `storage_category_id` | many2one | stock.storage.category | Storage Category |
| `user_id` | many2one | res.users | Assigned To |
| `warehouse_id` | many2one | stock.warehouse | Warehouse |
| `write_uid` | many2one | res.users | Last Updated by |

---

## stock.location - Emplacement de Stock

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `active` | boolean | Active |  | By unchecking the active field, you may hide a location without deleting it. |
| `complete_name` | char | Full Location Name |  |  |
| `name` | char | Location Name | ✓ |  |
| `usage` | selection | Location Type | ✓ | * Vendor: Virtual location representing the source location for products coming  |

### Champs de selection (valeurs possibles)

**usage** (Location Type):
- `supplier` = Vendor
- `view` = Virtual
- `internal` = Internal
- `customer` = Customer
- `inventory` = Inventory Loss
- `production` = Production
- `transit` = Transit

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `child_ids` | one2many | stock.location | Contains |
| `child_internal_location_ids` | many2many | stock.location | Internal locations among descendants |
| `company_id` | many2one | res.company | Company |
| `create_uid` | many2one | res.users | Created by |
| `incoming_move_line_ids` | one2many | stock.move.line | Incoming Move Line |
| `location_id` | many2one | stock.location | Parent Location |
| `outgoing_move_line_ids` | one2many | stock.move.line | Outgoing Move Line |
| `putaway_rule_ids` | one2many | stock.putaway.rule | Putaway Rules |
| `quant_ids` | one2many | stock.quant | Quant |
| `removal_strategy_id` | many2one | product.removal | Removal Strategy |
| `storage_category_id` | many2one | stock.storage.category | Storage Category |
| `valuation_account_id` | many2one | account.account | Stock Valuation Account |
| `warehouse_id` | many2one | stock.warehouse | Warehouse |
| `warehouse_view_ids` | one2many | stock.warehouse | Warehouse View |
| `write_uid` | many2one | res.users | Last Updated by |

---

## stock.warehouse - Entrepot

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `code` | char | Short Name | ✓ | Short name used to identify your warehouse |
| `name` | char | Warehouse | ✓ |  |

### Champs de selection (valeurs possibles)

**reception_steps** (Incoming Shipments):
- `one_step` = Receive and Store (1 step)
- `two_steps` = Receive then Store (2 steps)
- `three_steps` = Receive, Quality Control, then Store (3 steps)

**delivery_steps** (Outgoing Shipments):
- `ship_only` = Deliver (1 step)
- `pick_ship` = Pick then Deliver (2 steps)
- `pick_pack_ship` = Pick, Pack, then Deliver (3 steps)

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `company_id` | many2one | res.company | Company |
| `delivery_route_id` | many2one | stock.route | Delivery Route |
| `in_type_id` | many2one | stock.picking.type | In Type |
| `int_type_id` | many2one | stock.picking.type | Internal Type |
| `lot_stock_id` | many2one | stock.location | Location Stock |
| `mto_pull_id` | many2one | stock.rule | MTO rule |
| `out_type_id` | many2one | stock.picking.type | Out Type |
| `pack_type_id` | many2one | stock.picking.type | Pack Type |
| `partner_id` | many2one | res.partner | Address |
| `pick_type_id` | many2one | stock.picking.type | Pick Type |
| `qc_type_id` | many2one | stock.picking.type | Quality Control Type |
| `reception_route_id` | many2one | stock.route | Receipt Route |
| `route_ids` | many2many | stock.route | Routes |
| `store_type_id` | many2one | stock.picking.type | Storage Type |
| `view_location_id` | many2one | stock.location | View Location |
| `wh_input_stock_loc_id` | many2one | stock.location | Input Location |
| `wh_output_stock_loc_id` | many2one | stock.location | Output Location |
| `wh_pack_stock_loc_id` | many2one | stock.location | Packing Location |
| `wh_qc_stock_loc_id` | many2one | stock.location | Quality Control Location |
| `xdock_type_id` | many2one | stock.picking.type | Cross Dock Type |
| ... | ... | ... | (4 autres relations) |

---

## stock.picking - Bon de Transfert/Livraison

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `date_done` | datetime | Date of Transfer |  | Date at which the transfer has been processed or cancelled. |
| `name` | char | Reference |  |  |
| `origin` | char | Source Document |  | Reference of the document |
| `scheduled_date` | datetime | Scheduled Date |  | Scheduled time for the first part of the shipment to be processed. Setting manua |
| `state` | selection | Status |  |  * Draft: The transfer is not confirmed yet. Reservation doesn't apply.  * Waiti |

### Champs de selection (valeurs possibles)

**state** (Status):
- `draft` = Draft
- `waiting` = Waiting Another Operation
- `confirmed` = Waiting
- `assigned` = Ready
- `done` = Done
- `cancel` = Cancelled

**activity_state** (Activity State):
- `overdue` = Overdue
- `today` = Today
- `planned` = Planned

**activity_exception_decoration** (Activity Exception Decoration):
- `warning` = Alert
- `danger` = Error

**move_type** (Shipping Policy):
- `direct` = As soon as possible
- `one` = When all products are ready

**priority** (Priority):
- `0` = Normal
- `1` = Urgent

**picking_type_code** (Type of Operation):
- `incoming` = Receipt
- `outgoing` = Delivery
- `internal` = Internal Transfer

**products_availability_state** (Products Availability State):
- `available` = Available
- `expected` = Expected
- `late` = Late

**search_date_category** (Date Category):
- `before` = Before
- `yesterday` = Yesterday
- `today` = Today
- `day_1` = Tomorrow
- `day_2` = The day after tomorrow
- `after` = After

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `activity_calendar_event_id` | many2one | calendar.event | Next Activity Calendar Event |
| `activity_ids` | one2many | mail.activity | Activities |
| `activity_type_id` | many2one | mail.activity.type | Next Activity Type |
| `activity_user_id` | many2one | res.users | Responsible User |
| `backorder_id` | many2one | stock.picking | Back Order of |
| `backorder_ids` | one2many | stock.picking | Back Orders |
| `location_dest_id` | many2one | stock.location | Destination Location |
| `location_id` | many2one | stock.location | Source Location |
| `message_follower_ids` | one2many | mail.followers | Followers |
| `message_ids` | one2many | mail.message | Messages |
| `message_partner_ids` | many2many | res.partner | Followers (Partners) |
| `move_ids` | one2many | stock.move | Stock Moves |
| `partner_id` | many2one | res.partner | Contact |
| `picking_type_id` | many2one | stock.picking.type | Operation Type |
| `rating_ids` | one2many | rating.rating | Ratings |
| `reference_ids` | many2many | stock.reference | References |
| `return_id` | many2one | stock.picking | Return of |
| `return_ids` | one2many | stock.picking | Returns |
| `warehouse_address_id` | many2one | res.partner | Address |
| `website_message_ids` | one2many | mail.message | Website Messages |
| ... | ... | ... | (12 autres relations) |

---

## stock.picking.type - Type de Transfert

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `code` | selection | Type of Operation | ✓ |  |
| `name` | char | Operation Type | ✓ |  |
| `sequence_code` | char | Sequence Prefix | ✓ |  |

### Champs de selection (valeurs possibles)

**code** (Type of Operation):
- `incoming` = Receipt
- `outgoing` = Delivery
- `internal` = Internal Transfer

**reservation_method** (Reservation Method):
- `at_confirm` = At Confirmation
- `manual` = Manually
- `by_date` = Before scheduled date

**product_label_format** (Product Label Format to auto-print):
- `dymo` = Dymo
- `2x7xprice` = 2 x 7 with price
- `4x7xprice` = 4 x 7 with price
- `4x12` = 4 x 12
- `4x12xprice` = 4 x 12 with price
- `zpl` = ZPL Labels
- `zplxprice` = ZPL Labels with price

**lot_label_format** (Lot Label Format to auto-print):
- `4x12_lots` = 4 x 12 - One per lot/SN
- `4x12_units` = 4 x 12 - One per unit
- `zpl_lots` = ZPL Labels - One per lot/SN
- `zpl_units` = ZPL Labels - One per unit

**package_label_to_print** (Package Label to Print):
- `pdf` = PDF
- `zpl` = ZPL

**create_backorder** (Create Backorder):
- `ask` = Ask
- `always` = Always
- `never` = Never

**move_type** (Shipping Policy):
- `direct` = As soon as possible
- `one` = When all products are ready

**restrict_put_in_pack** (Force put in pack?):
- `mandatory` = After each product
- `optional` = After group of products
- `no` = No

**restrict_scan_tracking_number** (Force Lot/Serial scan?):
- `mandatory` = Mandatory Scan
- `optional` = Optional Scan

**restrict_scan_source_location** (Force Source Location scan?):
- `no` = No Scan
- `mandatory` = Mandatory Scan

**restrict_scan_dest_location** (Force Destination Location scan?):
- `mandatory` = After each product
- `optional` = After group of products
- `no` = No

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `company_id` | many2one | res.company | Company |
| `create_uid` | many2one | res.users | Created by |
| `default_location_dest_id` | many2one | stock.location | Destination Location |
| `default_location_src_id` | many2one | stock.location | Source Location |
| `favorite_user_ids` | many2many | res.users | Favorite User |
| `return_picking_type_id` | many2one | stock.picking.type | Operation Type for Returns |
| `sequence_id` | many2one | ir.sequence | Reference Sequence |
| `warehouse_id` | many2one | stock.warehouse | Warehouse |
| `write_uid` | many2one | res.users | Last Updated by |

---

## stock.lot - Lot/Numero de Serie

### Champs principaux

| Champ | Type | Label | Requis | Description |
|-------|------|-------|--------|-------------|
| `name` | char | Lot/Serial Number | ✓ | Unique Lot/Serial Number |

### Champs de selection (valeurs possibles)

**activity_state** (Activity State):
- `overdue` = Overdue
- `today` = Today
- `planned` = Planned

**activity_exception_decoration** (Activity Exception Decoration):
- `warning` = Alert
- `danger` = Error

### Relations

| Champ | Type | Modele lie | Label |
|-------|------|------------|-------|
| `activity_calendar_event_id` | many2one | calendar.event | Next Activity Calendar Event |
| `activity_ids` | one2many | mail.activity | Activities |
| `activity_type_id` | many2one | mail.activity.type | Next Activity Type |
| `activity_user_id` | many2one | res.users | Responsible User |
| `company_currency_id` | many2one | res.currency | Valuation Currency |
| `company_id` | many2one | res.company | Company |
| `create_uid` | many2one | res.users | Created by |
| `delivery_ids` | many2many | stock.picking | Transfers |
| `location_id` | many2one | stock.location | Location |
| `message_follower_ids` | one2many | mail.followers | Followers |
| `message_ids` | one2many | mail.message | Messages |
| `message_partner_ids` | many2many | res.partner | Followers (Partners) |
| `partner_ids` | many2many | res.partner | Partner |
| `product_id` | many2one | product.product | Product |
| `product_uom_id` | many2one | uom.uom | Unit |
| `quant_ids` | one2many | stock.quant | Quants |
| `rating_ids` | one2many | rating.rating | Ratings |
| `sale_order_ids` | many2many | sale.order | Sales Orders |
| `website_message_ids` | one2many | mail.message | Website Messages |
| `write_uid` | many2one | res.users | Last Updated by |

---

## Relations entre modeles

### Flux d'un achat (Purchase -> Stock)

```
purchase.order (Commande achat)
    |
    v
stock.picking (Bon de reception, picking_type = incoming)
    |
    v
stock.move (Mouvement: Vendors -> WH/Stock)
    |
    v
stock.quant (Mise a jour quantite en stock)
    |
    v
product.product.qty_available (Stock disponible recalcule)
```

### Flux d'une vente (Sale -> Stock)

```
sale.order (Commande vente)
    |
    v
stock.picking (Bon de livraison, picking_type = outgoing)
    |
    v
stock.move (Mouvement: WH/Stock -> Customers)
    |
    v
stock.quant (Mise a jour quantite)
    |
    v
product.product.qty_available (Stock disponible recalcule)
```

### Creation directe de mouvement (sans picking)

```javascript
// Possible via API mais n'apparait pas dans Entrants/Sortants
await callOdoo('stock.move', 'create', [{
  product_id: 19,
  product_uom_qty: 100,
  quantity: 100,
  product_uom: 1,
  location_id: 1,      // Vendors (supplier)
  location_dest_id: 5, // WH/Stock (internal)
  state: 'done',
  price_unit: 10.50
}]);
```

---

## Methodes de cout

### Configuration (product.category.property_cost_method)

| Methode | Code | Comportement |
|---------|------|--------------|
| **Prix Standard** | `standard` | Prix fixe, modifiable manuellement uniquement |
| **Cout Moyen (CUMP)** | `average` | Recalcule automatiquement a chaque reception |
| **FIFO** | `fifo` | Premier entre, premier sorti |

### Calcul du CUMP (Cout Unitaire Moyen Pondere)

```
Nouveau CUMP = (Stock_existant × CUMP_actuel + Quantite_achetee × Prix_achat)
               / (Stock_existant + Quantite_achetee)
```

**Exemple:**
- Stock: 100 unites a 10€ (CUMP = 10€)
- Achat: 50 unites a 12€
- Nouveau CUMP = (100 × 10 + 50 × 12) / 150 = 1600 / 150 = **10.67€**

**Important:** Les sorties (ventes) ne modifient PAS le CUMP. Les articles sortent valorises au CUMP actuel.

### Changer la methode de cout

```javascript
// Via API
await callOdoo('product.category', 'write', [[1], {
  property_cost_method: 'average'  // ou 'standard', 'fifo'
}]);
```

---

## Exemples d'utilisation API

### Creer un produit stockable

```javascript
// 1. Creer le produit
const productId = await callOdoo('product.product', 'create', [{
  name: 'Mon Produit',
  default_code: 'PROD001',
  standard_price: 10.00,
  list_price: 15.00
}]);

// 2. Activer le suivi de stock (is_storable)
const product = await callOdoo('product.product', 'search_read', [
  [['id', '=', productId]]
], { fields: ['product_tmpl_id'] });

await callOdoo('product.template', 'write', [[product[0].product_tmpl_id[0]], {
  is_storable: true
}]);
```

### Creer un mouvement d'entree (achat)

```javascript
await callOdoo('stock.move', 'create', [{
  product_id: productId,
  product_uom_qty: 100,
  quantity: 100,
  product_uom: 1,
  location_id: 1,        // Vendors
  location_dest_id: 5,   // WH/Stock
  state: 'done',
  price_unit: 10.50,
  date: '2025-01-15 10:00:00',
  origin: 'PO-001'
}]);
```

### Creer un mouvement de sortie (vente)

```javascript
await callOdoo('stock.move', 'create', [{
  product_id: productId,
  product_uom_qty: 30,
  quantity: 30,
  product_uom: 1,
  location_id: 5,        // WH/Stock
  location_dest_id: 2,   // Customers
  state: 'done',
  price_unit: 15.00,
  date: '2025-01-20 14:00:00',
  origin: 'SO-001'
}]);
```

### Lire le stock d'un produit

```javascript
const product = await callOdoo('product.product', 'search_read', [
  [['default_code', '=', 'PROD001']]
], {
  fields: ['qty_available', 'virtual_available', 'incoming_qty', 'outgoing_qty']
});

console.log('Stock disponible:', product[0].qty_available);
console.log('Stock previsionnel:', product[0].virtual_available);
console.log('Entrees prevues:', product[0].incoming_qty);
console.log('Sorties prevues:', product[0].outgoing_qty);
```

### Lire le stock par emplacement

```javascript
const quants = await callOdoo('stock.quant', 'search_read', [
  [['product_id', '=', productId]]
], {
  fields: ['location_id', 'quantity', 'reserved_quantity']
});

for (const q of quants) {
  console.log(q.location_id[1] + ': ' + q.quantity + ' (reserve: ' + q.reserved_quantity + ')');
}
```

### Ajuster l'inventaire (via stock.quant)

```javascript
// Verifier/creer un quant
const existingQuant = await callOdoo('stock.quant', 'search_read', [
  [['product_id', '=', productId], ['location_id', '=', 5]]
], { fields: ['id', 'quantity'], limit: 1 });

if (existingQuant.length > 0) {
  // Mettre a jour
  await callOdoo('stock.quant', 'write', [[existingQuant[0].id], {
    quantity: 500
  }]);
} else {
  // Creer
  await callOdoo('stock.quant', 'create', [{
    product_id: productId,
    location_id: 5,
    quantity: 500
  }]);
}
```

---

## Champs calcules importants (product.product)

| Champ | Description |
|-------|-------------|
| `qty_available` | Stock physique disponible (somme des quants) |
| `virtual_available` | Stock previsionnel (disponible + entrees - sorties prevues) |
| `incoming_qty` | Quantite en cours de reception |
| `outgoing_qty` | Quantite en cours d'expedition |
| `free_qty` | Quantite libre (disponible - reserve) |

---

## Notes importantes

1. **stock.move vs stock.picking**: Les `stock.move` sont les mouvements unitaires, les `stock.picking` regroupent plusieurs mouvements (un bon de livraison peut contenir plusieurs lignes).

2. **Emplacements virtuels**: Les emplacements `supplier` et `customer` sont virtuels - ils n'existent pas physiquement mais servent a tracer les entrees/sorties.

3. **state des mouvements**: Un mouvement passe par `draft` -> `confirmed` -> `assigned` -> `done`. Via API, on peut creer directement en `done`.

4. **is_storable**: Sans ce flag a `true`, le produit est considere comme consommable et le stock n'est pas tracke.

5. **API vs Interface**: L'API permet de contourner certaines validations de l'interface (mouvements verrouilles, prix, etc.) car elle fait confiance au developpeur.

---

*Documentation generee automatiquement - 2026-01-07T21:33:38.304Z*
