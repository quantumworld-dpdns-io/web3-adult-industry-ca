struct Date {
    year: Field,
    month: Field,
    day: Field,
}

fn main(
    birth_date: Date,
    minimum_age: pub Field,
    current_date: pub Date,
) {
    let age_in_days = (current_date.year - birth_date.year) * 365
        + (current_date.month - birth_date.month) * 30
        + (current_date.day - birth_date.day);

    let min_age_in_days = minimum_age * 365;

    constrain(age_in_days >= min_age_in_days);

    constrain(birth_date.year <= current_date.year);
    constrain(birth_date.month >= 1);
    constrain(birth_date.month <= 12);
    constrain(birth_date.day >= 1);
    constrain(birth_date.day <= 31);
}
