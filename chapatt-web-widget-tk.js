/*
 * Copyright (c) 2017 Chase Patterson
 */

if (!chapatt) {
    var chapatt = {};
}

chapatt.Signal = {
    initSignal: function(name) {
        this.callbacks = [];

        this.name = name;
    },

    connect: function(callback, userData) {
        this.callbacks.push({"callback": callback, "userData": userData});
    },

    emit: function(targetWidget, signalData) {
        var self = this;

        this.callbacks.forEach(function(item) {
            item.callback(targetWidget, self.name, signalData, item.userData);
        });
    },

    new: function(name) {
        var signal = Object.create(this);
        signal.initSignal(name);

        return signal;
    }
}

chapatt.Emitter = {
    initEmitter: function() {
        this.signals = [];
    },

    addSignal: function(name) {
        // if signal exists, throw error
        var signal = chapatt.Signal.new(name);
        this.signals.push(signal);
    },

    signalConnect: function(name, callback, userData) {
        // if signal doesn't exist, throw error
        this.signals.find(function(item) {
            return item.name === name;
        }).connect(callback, userData);
    },

    signalEmit: function(name, signalData) {
        var self = this;

        // if signal doesn't exist, throw error
        this.signals.find(function(item) {
            return item.name === name;
        }).emit(self, signalData);
    }
}

chapatt.Unit = {
    initUnit: function(initialName, initialSymbol, initialConvFrom, initialConvTo) {
        if (initialName) {
            this.name = initialName;
            if (initialSymbol) {
                this.symbol = initialSymbol;
                if (initialConvFrom) {
                    this.convFrom = initialConvFrom;
                    if (initialConvTo) {
                        this.convTo = initialConvTo;
                    }
                }
            }
        }
    },

    new: function(initialName, initialSymbol, initialConvFrom, initialConvTo) {
        var unit = Object.create(this);
        unit.initUnit.apply(unit, function() {
            var args = [];

            if (initialName) {
                args.push(initialName);
                if (initialSymbol) {
                    args.push(initialSymbol);
                    if (initialConvFrom) {
                        args.push(initialConvFrom);
                        if (initialConvTo) {
                            args.push(initialConvTo);
                        }
                    }
                }
            }

            return args;
        }());
        return unit;
    }
}

chapatt.UnitModel = {
    initUnitModel: function(initialUnits) {
        this.units = [];

        if (initialUnits) {
            this.addUnits(initialUnits);
        }
    },

    addUnits: function(units) {
        units.forEach(function(item) {
            this.units.push(item);
        }.bind(this));
    },

    valueFromToUnit: function(value, fromUnitIndex, toUnitIndex) {
    },

    new: function() {
        var unitModel = Object.create(this);
        unitModel.initUnitModel();
        return unitModel;
    }
}

chapatt.ValueModel = {};
Object.assign(chapatt.ValueModel, chapatt.Emitter);
Object.assign(chapatt.ValueModel,
{
    initValueModel: function() {
        this.initEmitter();
        this.addSignal('valueChanged');

        this.unitModel = chapatt.UnitModel.new();
        this.unitIndex = 1;
    },

    getUnitModel: function() {
        return this.unitModel;
    },

    setUnitModel: function(unitModel) {
        this.unitModel = unitModel;
    },

    getUnit: function() {
        return this.unitIndex;
    },

    setUnit: function(unitIndex) {
        this.unitIndex = unitIndex;
    },

    /* If no unitIndex given, get value in current unit */
    getValue: function(unitIndex) {
        if (!unitIndex) {
            return this.value;
        } else {
            return this.unitModel.valueFromToUnit(this.value, this.unitIndex, unitIndex);
        }
    },

    setValue: function(value) {
        this.signalEmit('valueChanged', value);
        this.value = value;
    },

    new: function() {
        var valueModel = Object.create(this);
        valueModel.initValueModel();
        return valueModel;
    }
});

chapatt.Valuable = {
    initValuable: function() {
        this.valueModel = chapatt.ValueModel.new();
    },

    getValueModel: function() {
        return this.valueModel;
    },

    setValueModel: function(valueModel) {
        this.valueModel = valueModel;
    }
}

chapatt.Widget = {
    widgets: [],

    initWidget: function(element) {
        this.element = element;

        this.widgets.push(this);
    },

    getByElement: function(element) {
        return this.instances.find(function(item) {
            return (item.element === element);
        });
    }
}

chapatt.TextBox = Object.create(chapatt.Widget);
Object.assign(chapatt.TextBox, chapatt.Valuable);
Object.assign(chapatt.TextBox,
{
    textBoxes: [],

    initTextBox: function(element) {
        this.initWidget(element);
        this.initValuable();

        this.textBoxes.push(this);

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));

        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        field.addEventListener('keydown', this.fieldHandleKeydown.bind(this));
        field.addEventListener('focusout', this.fieldHandleFocusout.bind(this));

        this.mutatedSinceSaved = false;
        var fieldObserver = new MutationObserver(this.fieldHandleMutation.bind(this));
        fieldObserver.observe(field, {characterData: true, subtree: true});
    },

    handleValueChanged: function(targetWidget, signalName, signalData)  {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        field.textContent = signalData;
    },

    fieldHandleKeydown: function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();

            // FIXME! if set to change on enter
            this.saveFieldText();
        }
    },

    fieldHandleFocusout: function(event) {
        // FIXME! if set to change on mouseout
            // only save if text has mutated (to prevent rounding of actual value to display value)
            if (this.mutatedSinceSaved)
                this.saveFieldText();
    },

    fieldHandleMutation: function(mutations) {
        this.mutatedSinceSaved = true;

        // FIXME! if set to change on mutation
        //this.saveFieldText();
    },

    saveFieldText: function() {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        this.valueModel.setValue(field.textContent);

        this.mutatedSinceSaved = false;
    },

    new: function(element) {
        var textBox = Object.create(this);
        textBox.initTextBox(element);
        return textBox;
    }
});

chapatt.Button = Object.create(chapatt.Widget);
Object.assign(chapatt.Button, chapatt.Emitter);
Object.assign(chapatt.Button,
{
    buttons: [],

    initButton: function(element) {
        this.initWidget(element);
        this.initEmitter();

        this.buttons.push(this);

        this.addSignal('clicked');
        this.element.addEventListener('click', this.handleClick.bind(this));

        this.element.addEventListener('mousedown', function(event)
        {
            event.preventDefault();
        });
    },

    handleClick: function() {
            this.signalEmit('clicked');
    },

    new: function(element) {
        var button = Object.create(this);
        button.initButton(element);
        return button;
    }
});

chapatt.ToggleButton = Object.create(chapatt.Button);
Object.assign(chapatt.ToggleButton, chapatt.Valuable);
Object.assign(chapatt.ToggleButton,
{
    toggleButtons: [],

    initToggleButton: function(element) {
        this.initButton(element);
        this.initValuable();

        this.toggleButtons.push(this);

        this.signalConnect('clicked', this.toggle.bind(this));

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));

        if (this.element.classList.contains('selected'))
            this.valueModel.setValue('selected');
        else
            this.valueModel.setValue('unselected');
    },

    toggle: function() {
        if (this.valueModel.getValue() == 'selected') {
            this.valueModel.setValue('unselected');
        } else {
            this.valueModel.setValue('selected');
        }
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        classList = this.element.classList;
        if (signalData == 'selected') {
            if (!classList.contains('selected'))
                classList.add('selected');
        } else {
            if (classList.contains('selected'))
                this.element.classList.remove('selected');
        }
    },

    new: function(element) {
        var toggleButton = Object.create(this);
        toggleButton.initToggleButton(element);
        return toggleButton;
    }
});

chapatt.SpinBox = Object.create(chapatt.Widget);
Object.assign(chapatt.SpinBox, chapatt.Valuable);
Object.assign(chapatt.SpinBox,
{
    initSpinBox: function(element, initialUnits) {
        this.initWidget(element);
        this.initValuable();
        this.valueModel.getUnitModel().addUnits(initialUnits);

        // the magnitude of the wheel delta which results in 1 unit change.
        // Larger values result in finer adjustment
        this.scrollPixelsPerUnit = 10;

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));

        this.field = chapatt.TextBox.new(this.element);
        this.field.valueModel.signalConnect('valueChanged',
            this.handleFieldValueChanged.bind(this));

        this.increaseButton = chapatt.Button.new(this.element.getElementsByClassName('increase')[0]);
        this.decreaseButton = chapatt.Button.new(this.element.getElementsByClassName('decrease')[0]);

        this.increaseButton.element.addEventListener('click', this.increase.bind(this));
        this.decreaseButton.element.addEventListener('click', this.decrease.bind(this));

        this.element.addEventListener('wheel', this.handleWheel.bind(this));

        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        this.setValueParsingString(field.textContent);
    },

    handleFieldValueChanged: function(targetWidget, signalName, signalData) {
        this.setValueParsingString(signalData);
    },

    setValueParsingString: function(string) {
        if (isNaN(Number(string))) {
            // Not a number; attempt to parse as number with suffix
            this.valueModel.getUnitModel().units.forEach(function(unit, index) {
                if (string.endsWith(unit.symbol)) {
                    // if set to switch to this unit by default
                    this.valueModel.setUnit(index);

                    this.valueModel.setValue(unit.convFrom(Number(string.slice(0, -unit.symbol.length))));
                }
            }.bind(this));
        } else {
            this.valueModel.setValue(this.valueModel.getUnitModel().units[this.valueModel.unitIndex].convFrom(Number(string)));
        }
    },

    increase: function() {
        this.valueModel.setValue(this.valueModel.getValue() + this.valueModel.getUnitModel().units[this.valueModel.getUnit()].convFrom(1));
    },

    decrease: function() {
        this.valueModel.setValue(this.valueModel.getValue() - this.valueModel.getUnitModel().units[this.valueModel.getUnit()].convFrom(1));
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        // FIXME! round before displaying
        field.textContent = this.valueModel.getUnitModel().units[this.valueModel.unitIndex].convTo(signalData);

        // FIXME! if set to show unit suffix
        field.textContent = field.textContent + ' ' + this.valueModel.getUnitModel().units[this.valueModel.unitIndex].symbol;
    },

    handleWheel: function(event) {
        // FIXME! add x and y scrolling
        this.valueModel.setValue(this.valueModel.getValue() + this.valueModel.getUnitModel().units[this.valueModel.getUnit()].convFrom(-event.deltaY / this.scrollPixelsPerUnit));

        event.preventDefault();
    },

    new: function(element, initialUnits) {
        var spinBox = Object.create(this);
        spinBox.initSpinBox(element, initialUnits);
        return spinBox;
    }
});

chapatt.ButtonGroup = Object.create(chapatt.Widget);
Object.assign(chapatt.ButtonGroup, chapatt.Emitter);
Object.assign(chapatt.ButtonGroup,
{
    buttonGroups: [],

    initButtonGroup: function(element) {
        this.initWidget(element);
        this.initEmitter();

        this.buttonGroups.push(this);

        this.addSignal('clicked');
        this.buttons = [];
        this.initButtons();

        this.element.addEventListener('mousedown', function(event)
        {
            event.preventDefault();
        });
    },

    initButtons: function() {
        var buttons = this.element.getElementsByClassName('button');
        for (var i = 0; i < buttons.length; i++) {
            this.buttons.push(buttons[i]);
            buttons[i].addEventListener('click', this.handleClick.bind(this, i));
        }
    },

    handleClick: function(buttonIndex) {
            this.signalEmit('clicked', buttonIndex);
    },

    new: function(element) {
        var buttonGroup = Object.create(this);
        buttonGroup.initButtonGroup(element);
        return buttonGroup;
    }
});
